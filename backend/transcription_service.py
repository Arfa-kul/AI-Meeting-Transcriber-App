"""
Transcription Service — Wraps faster-whisper for audio → text.
Loads the model once and reuses it across requests.
"""

import time
import threading
from typing import Optional
from faster_whisper import WhisperModel

import config
from database import update_transcription

# ── Global model cache ──────────────────────────────────────────────────
_model: Optional[WhisperModel] = None
_model_lock = threading.Lock()
_current_model_size: Optional[str] = None
_model_loading = False


def get_model(model_size: str | None = None) -> WhisperModel:
    """
    Return the cached WhisperModel, loading/downloading it if needed.
    Thread-safe: only one thread will load the model at a time.
    """
    global _model, _current_model_size, _model_loading

    if model_size is None:
        model_size = config.WHISPER_MODEL_SIZE

    with _model_lock:
        if _model is not None and _current_model_size == model_size:
            return _model

        _model_loading = True
        print(f"[TranscriptionService] Loading model '{model_size}' "
              f"(device={config.WHISPER_DEVICE}, compute={config.WHISPER_COMPUTE_TYPE})...")
        print(f"[TranscriptionService] Model cache: {config.WHISPER_DOWNLOAD_ROOT}")
        print("[TranscriptionService] First run may download model files — please wait...")

        try:
            _model = WhisperModel(
                model_size,
                device=config.WHISPER_DEVICE,
                compute_type=config.WHISPER_COMPUTE_TYPE,
                download_root=config.WHISPER_DOWNLOAD_ROOT,
            )
            _current_model_size = model_size
            print(f"[TranscriptionService] Model '{model_size}' loaded successfully.")
        except Exception as e:
            _model_loading = False
            raise RuntimeError(f"Failed to load Whisper model '{model_size}': {e}")
        finally:
            _model_loading = False

        return _model


def is_model_loading() -> bool:
    return _model_loading


def get_current_model_info() -> dict:
    return {
        "loaded": _model is not None,
        "model_size": _current_model_size,
        "loading": _model_loading,
        "device": config.WHISPER_DEVICE,
        "compute_type": config.WHISPER_COMPUTE_TYPE,
    }


# ── Transcription ───────────────────────────────────────────────────────

def transcribe_audio(
    file_path: str,
    record_id: int,
    model_size: str | None = None,
    language: str | None = None,
    word_timestamps: bool = False,
):
    """
    Transcribe an audio file using faster-whisper.
    Updates the database record with progress, results, and errors.
    """
    start_time = time.time()

    try:
        # Update status to processing
        update_transcription(record_id, {
            "status": "processing",
            "progress": 5.0,
        })

        # Load model
        model = get_model(model_size)
        update_transcription(record_id, {"progress": 15.0})

        # Transcribe
        transcribe_kwargs = {
            "beam_size": 5,
            "word_timestamps": word_timestamps,
            "vad_filter": True,
            "vad_parameters": {
                "min_silence_duration_ms": 500,
                "speech_pad_ms": 200,
            },
        }
        if language and language.strip():
            transcribe_kwargs["language"] = language.strip()

        segments_gen, info = model.transcribe(file_path, **transcribe_kwargs)

        # Collect segments
        segments = []
        full_text_parts = []
        total_duration = info.duration if info.duration else 1.0

        for seg in segments_gen:
            seg_data = {
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
            }

            # Word-level timestamps
            if word_timestamps and seg.words:
                seg_data["words"] = [
                    {
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 4),
                    }
                    for w in seg.words
                ]

            segments.append(seg_data)
            full_text_parts.append(seg.text.strip())

            # Update progress (15% → 85% based on timeline)
            progress = 15.0 + (seg.end / total_duration) * 70.0
            progress = min(progress, 85.0)
            update_transcription(record_id, {"progress": round(progress, 1)})

        full_text = " ".join(full_text_parts)
        elapsed = round(time.time() - start_time, 2)

        detected_lang = info.language if info.language else ""
        lang_prob = round(info.language_probability, 4) if info.language_probability else 0.0

        update_transcription(record_id, {
            "status": "completed",
            "progress": 100.0,
            "transcript_text": full_text,
            "segments_json": segments,
            "language_detected": f"{detected_lang} ({lang_prob})",
            "audio_duration": round(info.duration, 2) if info.duration else 0.0,
            "processing_duration": elapsed,
        })

        return {
            "success": True,
            "record_id": record_id,
            "text": full_text,
            "segments": segments,
            "language": detected_lang,
            "duration": elapsed,
        }

    except Exception as e:
        elapsed = round(time.time() - start_time, 2)
        error_msg = str(e)
        print(f"[TranscriptionService] Error transcribing record {record_id}: {error_msg}")

        update_transcription(record_id, {
            "status": "error",
            "progress": 0.0,
            "error_message": error_msg,
            "processing_duration": elapsed,
        })

        return {
            "success": False,
            "record_id": record_id,
            "error": error_msg,
        }
