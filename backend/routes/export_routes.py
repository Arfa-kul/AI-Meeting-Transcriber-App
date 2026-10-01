"""
Export Routes — download transcriptions in various formats.
"""

from flask import Blueprint, request, jsonify, Response
from database import get_transcription
from export_service import export_txt, export_srt, export_vtt, export_json

export_bp = Blueprint("export", __name__)


@export_bp.route("/api/export/<int:record_id>/<fmt>", methods=["GET"])
def export_transcription(record_id, fmt):
    """
    Export a transcription.
    Supported formats: txt, srt, vtt, json
    """
    record = get_transcription(record_id)
    if record is None:
        return jsonify({"error": "Transcription not found."}), 404

    if record["status"] != "completed":
        return jsonify({"error": "Transcription is not completed yet."}), 400

    # Parse summary for JSON export
    import json as json_mod
    if isinstance(record.get("summary"), str) and record["summary"]:
        try:
            record["summary"] = json_mod.loads(record["summary"])
        except Exception:
            pass

    fmt = fmt.lower()
    title = record.get("title", "transcript").replace(" ", "_")

    if fmt == "txt":
        content = export_txt(record)
        mimetype = "text/plain"
        ext = "txt"
    elif fmt == "srt":
        content = export_srt(record)
        mimetype = "application/x-subrip"
        ext = "srt"
    elif fmt == "vtt":
        content = export_vtt(record)
        mimetype = "text/vtt"
        ext = "vtt"
    elif fmt == "json":
        content = export_json(record)
        mimetype = "application/json"
        ext = "json"
    else:
        return jsonify({"error": f"Unsupported format: {fmt}. Use txt, srt, vtt, or json."}), 400

    filename = f"{title}.{ext}"

    return Response(
        content,
        mimetype=mimetype,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": f"{mimetype}; charset=utf-8",
        }
    )
