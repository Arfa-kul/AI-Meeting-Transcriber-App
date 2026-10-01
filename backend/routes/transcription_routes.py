"""
Transcription Routes — upload, transcribe, status, and results.
"""

import os
import threading
from flask import Blueprint, request, jsonify

import config
from database import (
    create_transcription, update_transcription,
    get_transcription,
)
from transcription_service import (
    transcribe_audio, get_current_model_info, is_model_loading, get_model,
)
from summarization_service import generate_summary
from utils.file_validation import validate_file, generate_safe_filename, get_audio_duration

transcription_bp = Blueprint("transcription", __name__)


@transcription_bp.route("/api/transcribe", methods=["POST"])
def upload_and_transcribe():
    """
    Upload an audio file and start transcription in a background thread.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]

    # Validate
    try:
        file_info = validate_file(file)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Optional params
    title = request.form.get("title", "").strip()
    if not title:
        title = os.path.splitext(file_info["original_filename"])[0]

    language = request.form.get("language", "").strip()
    model_size = request.form.get("model_size", config.WHISPER_MODEL_SIZE).strip()
    word_timestamps = request.form.get("word_timestamps", "false").lower() == "true"

    # Create DB record
    record_id = create_transcription({
        "title": title,
        "original_filename": file_info["original_filename"],
        "stored_filename": "",  # will update
        "file_size": file_info["file_size"],
        "language_selected": language,
        "model_size": model_size,
        "word_timestamps": 1 if word_timestamps else 0,
    })

    # Save file
    safe_name = generate_safe_filename(file_info["original_filename"], record_id)
    file_path = str(config.UPLOAD_DIR / safe_name)
    file.save(file_path)

    # Get audio duration
    duration = get_audio_duration(file_path)
    update_transcription(record_id, {
        "stored_filename": safe_name,
        "audio_duration": duration,
    })

    # Start transcription in background
    thread = threading.Thread(
        target=_background_transcribe,
        args=(file_path, record_id, model_size, language, word_timestamps),
        daemon=True,
    )
    thread.start()

    return jsonify({
        "message": "Transcription started.",
        "record_id": record_id,
        "title": title,
        "filename": file_info["original_filename"],
        "file_size": file_info["file_size"],
        "audio_duration": duration,
    }), 202


def _background_transcribe(file_path, record_id, model_size, language, word_timestamps):
    """Run transcription and summarization in a background thread."""
    result = transcribe_audio(
        file_path=file_path,
        record_id=record_id,
        model_size=model_size,
        language=language if language else None,
        word_timestamps=word_timestamps,
    )

    # Generate summary if transcription succeeded
    if result.get("success"):
        try:
            update_transcription(record_id, {"progress": 90.0})
            transcript_text = result.get("text", "")
            summary_data = generate_summary(transcript_text)

            import json
            update_transcription(record_id, {
                "summary": json.dumps(summary_data),
                "action_items": summary_data.get("action_items", []),
                "progress": 100.0,
            })
        except Exception as e:
            print(f"[Summarization] Error for record {record_id}: {e}")


@transcription_bp.route("/api/transcription/<int:record_id>", methods=["GET"])
def get_transcription_result(record_id):
    """Get the transcription result and status."""
    record = get_transcription(record_id)
    if record is None:
        return jsonify({"error": "Transcription not found."}), 404

    # Parse summary JSON if it's a string
    summary = record.get("summary", "")
    if isinstance(summary, str) and summary:
        try:
            import json
            record["summary"] = json.loads(summary)
        except Exception:
            record["summary"] = {"overview": summary, "method": "raw"}

    return jsonify(record), 200


@transcription_bp.route("/api/transcription/<int:record_id>/status", methods=["GET"])
def get_transcription_status(record_id):
    """Lightweight status check for polling."""
    record = get_transcription(record_id)
    if record is None:
        return jsonify({"error": "Transcription not found."}), 404

    return jsonify({
        "id": record["id"],
        "status": record["status"],
        "progress": record["progress"],
        "error_message": record.get("error_message", ""),
    }), 200


@transcription_bp.route("/api/transcription/<int:record_id>/summarize", methods=["POST"])
def regenerate_summary(record_id):
    """Re-generate the summary for a completed transcription."""
    record = get_transcription(record_id)
    if record is None:
        return jsonify({"error": "Transcription not found."}), 404

    if record["status"] != "completed":
        return jsonify({"error": "Transcription is not completed yet."}), 400

    transcript_text = record.get("transcript_text", "")
    if not transcript_text:
        return jsonify({"error": "No transcript text available."}), 400

    try:
        import json
        summary_data = generate_summary(transcript_text)
        update_transcription(record_id, {
            "summary": json.dumps(summary_data),
            "action_items": summary_data.get("action_items", []),
        })
        return jsonify({"message": "Summary regenerated.", "summary": summary_data}), 200
    except Exception as e:
        return jsonify({"error": f"Summarization failed: {e}"}), 500


@transcription_bp.route("/api/model/info", methods=["GET"])
def model_info():
    """Get current model information."""
    info = get_current_model_info()
    info["available_models"] = config.AVAILABLE_MODELS
    return jsonify(info), 200


@transcription_bp.route("/api/model/preload", methods=["POST"])
def preload_model():
    """Pre-load the Whisper model."""
    model_size = request.json.get("model_size", config.WHISPER_MODEL_SIZE) if request.json else config.WHISPER_MODEL_SIZE

    if is_model_loading():
        return jsonify({"message": "Model is already being loaded."}), 409

    def _load():
        try:
            get_model(model_size)
        except Exception as e:
            print(f"[Model] Preload failed: {e}")

    thread = threading.Thread(target=_load, daemon=True)
    thread.start()

    return jsonify({"message": f"Loading model '{model_size}' in background..."}), 202
