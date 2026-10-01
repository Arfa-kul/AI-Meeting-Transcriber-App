"""
History Routes — list, search, and delete transcriptions.
"""

from flask import Blueprint, request, jsonify
from database import (
    get_all_transcriptions, get_transcription,
    delete_transcription, get_dashboard_stats,
    search_transcriptions,
)

import json
import os
import config

history_bp = Blueprint("history", __name__)


@history_bp.route("/api/history", methods=["GET"])
def list_history():
    """List all transcriptions, newest first."""
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    records = get_all_transcriptions(limit=limit, offset=offset)

    # Parse summary JSON for each record
    for r in records:
        if isinstance(r.get("summary"), str) and r["summary"]:
            try:
                r["summary"] = json.loads(r["summary"])
            except Exception:
                r["summary"] = {}

    return jsonify({"transcriptions": records, "count": len(records)}), 200


@history_bp.route("/api/history/search", methods=["GET"])
def search_history():
    """Search transcriptions by keyword."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Search query is required."}), 400

    results = search_transcriptions(query)
    for r in results:
        if isinstance(r.get("summary"), str) and r["summary"]:
            try:
                r["summary"] = json.loads(r["summary"])
            except Exception:
                r["summary"] = {}

    return jsonify({"transcriptions": results, "count": len(results)}), 200


@history_bp.route("/api/history/<int:record_id>", methods=["DELETE"])
def delete_record(record_id):
    """Delete a transcription and its uploaded file."""
    record = get_transcription(record_id)
    if record is None:
        return jsonify({"error": "Transcription not found."}), 404

    # Delete file
    stored = record.get("stored_filename", "")
    if stored:
        file_path = config.UPLOAD_DIR / stored
        if file_path.exists():
            try:
                os.remove(str(file_path))
            except Exception:
                pass

    deleted = delete_transcription(record_id)
    if deleted:
        return jsonify({"message": "Transcription deleted."}), 200
    return jsonify({"error": "Failed to delete."}), 500


@history_bp.route("/api/dashboard", methods=["GET"])
def dashboard():
    """Dashboard statistics."""
    stats = get_dashboard_stats()

    # Parse summaries in recent transcriptions
    for r in stats.get("recent_transcriptions", []):
        if isinstance(r.get("summary"), str) and r["summary"]:
            try:
                r["summary"] = json.loads(r["summary"])
            except Exception:
                r["summary"] = {}

    return jsonify(stats), 200
