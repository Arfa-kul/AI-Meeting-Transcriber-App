"""
Export Service — generates TXT, SRT, VTT, and JSON exports from transcriptions.
"""

import json


def export_txt(transcription: dict) -> str:
    """Plain text export with timestamps."""
    lines = []
    title = transcription.get("title", "Untitled")
    lines.append(f"Transcript: {title}")
    lines.append(f"Date: {transcription.get('upload_date', '')}")
    lines.append(f"Language: {transcription.get('language_detected', 'Unknown')}")
    lines.append(f"Duration: {_format_duration(transcription.get('audio_duration', 0))}")
    lines.append("=" * 60)
    lines.append("")

    segments = transcription.get("segments_json", [])
    if segments:
        for seg in segments:
            ts = _format_timestamp_simple(seg.get("start", 0))
            lines.append(f"[{ts}]  {seg.get('text', '')}")
    else:
        lines.append(transcription.get("transcript_text", ""))

    # Append summary if available
    summary = transcription.get("summary", "")
    if summary:
        lines.append("")
        lines.append("=" * 60)
        lines.append("MEETING SUMMARY")
        lines.append("=" * 60)
        lines.append(summary)

    return "\n".join(lines)


def export_srt(transcription: dict) -> str:
    """SRT subtitle format."""
    segments = transcription.get("segments_json", [])
    if not segments:
        return ""

    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_timestamp_srt(seg.get("start", 0))
        end = _format_timestamp_srt(seg.get("end", 0))
        text = seg.get("text", "").strip()
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")

    return "\n".join(lines)


def export_vtt(transcription: dict) -> str:
    """WebVTT subtitle format."""
    segments = transcription.get("segments_json", [])
    lines = ["WEBVTT", ""]

    if not segments:
        return "\n".join(lines)

    for seg in segments:
        start = _format_timestamp_vtt(seg.get("start", 0))
        end = _format_timestamp_vtt(seg.get("end", 0))
        text = seg.get("text", "").strip()
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")

    return "\n".join(lines)


def export_json(transcription: dict) -> str:
    """JSON export with full metadata."""
    data = {
        "title": transcription.get("title", ""),
        "original_filename": transcription.get("original_filename", ""),
        "upload_date": transcription.get("upload_date", ""),
        "language_detected": transcription.get("language_detected", ""),
        "audio_duration": transcription.get("audio_duration", 0),
        "processing_duration": transcription.get("processing_duration", 0),
        "model_size": transcription.get("model_size", ""),
        "transcript_text": transcription.get("transcript_text", ""),
        "segments": transcription.get("segments_json", []),
        "summary": transcription.get("summary", ""),
        "action_items": transcription.get("action_items", []),
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


# ── Timestamp formatters ────────────────────────────────────────────────

def _format_timestamp_simple(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def _format_timestamp_srt(seconds: float) -> str:
    """SRT timestamp: HH:MM:SS,mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_timestamp_vtt(seconds: float) -> str:
    """VTT timestamp: HH:MM:SS.mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def _format_duration(seconds: float) -> str:
    """Human-readable duration string."""
    if seconds <= 0:
        return "Unknown"
    m = int(seconds // 60)
    s = int(seconds % 60)
    if m > 60:
        h = m // 60
        m = m % 60
        return f"{h}h {m}m {s}s"
    return f"{m}m {s}s"
