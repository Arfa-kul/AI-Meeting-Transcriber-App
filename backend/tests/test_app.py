"""
Tests for the AI Meeting Transcriber backend.
Run with: pytest tests/ -v
"""

import os
import sys
import json
import pytest
import tempfile

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from database import init_db, get_connection, create_transcription, get_transcription, delete_transcription, get_dashboard_stats
from export_service import export_txt, export_srt, export_vtt, export_json
from utils.file_validation import ValidationError
import config


# ── Fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def use_temp_db(tmp_path):
    """Use a temporary database for each test."""
    config.DATABASE_PATH = tmp_path / "test.db"
    config.UPLOAD_DIR = tmp_path / "uploads"
    config.UPLOAD_DIR.mkdir()
    init_db()
    yield


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def sample_transcription():
    """Create a sample transcription record."""
    record_id = create_transcription({
        "title": "Test Meeting",
        "original_filename": "test.mp3",
        "stored_filename": "recording_1.mp3",
        "file_size": 1024000,
        "audio_duration": 120.5,
        "language_selected": "en",
        "model_size": "base",
    })
    return record_id


# ── Database Tests ──────────────────────────────────────────────────────

class TestDatabase:
    def test_create_and_get(self, sample_transcription):
        record = get_transcription(sample_transcription)
        assert record is not None
        assert record["title"] == "Test Meeting"
        assert record["original_filename"] == "test.mp3"
        assert record["status"] == "pending"

    def test_delete(self, sample_transcription):
        assert delete_transcription(sample_transcription) is True
        assert get_transcription(sample_transcription) is None

    def test_delete_nonexistent(self):
        assert delete_transcription(99999) is False

    def test_dashboard_stats(self, sample_transcription):
        stats = get_dashboard_stats()
        assert stats["total_recordings"] == 1
        assert stats["total_audio_duration"] == 120.5
        assert len(stats["recent_transcriptions"]) == 1

    def test_get_nonexistent(self):
        assert get_transcription(99999) is None


# ── File Validation Tests ───────────────────────────────────────────────

class TestFileValidation:
    def test_allowed_extensions(self):
        assert ".mp3" in config.ALLOWED_EXTENSIONS
        assert ".wav" in config.ALLOWED_EXTENSIONS
        assert ".m4a" in config.ALLOWED_EXTENSIONS
        assert ".exe" not in config.ALLOWED_EXTENSIONS

    def test_max_file_size(self):
        assert config.MAX_FILE_SIZE_BYTES == config.MAX_FILE_SIZE_MB * 1024 * 1024


# ── Export Tests ────────────────────────────────────────────────────────

class TestExport:
    @pytest.fixture
    def completed_record(self):
        return {
            "title": "Sprint Review",
            "upload_date": "2024-01-15T10:00:00",
            "language_detected": "en (0.98)",
            "audio_duration": 300.0,
            "transcript_text": "Hello everyone, let's start the meeting.",
            "segments_json": [
                {"id": 0, "start": 0.0, "end": 2.5, "text": "Hello everyone."},
                {"id": 1, "start": 2.5, "end": 5.0, "text": "Let's start the meeting."},
            ],
            "summary": "",
            "action_items": [],
            "model_size": "base",
            "processing_duration": 5.2,
            "original_filename": "sprint_review.mp3",
        }

    def test_export_txt(self, completed_record):
        txt = export_txt(completed_record)
        assert "Sprint Review" in txt
        assert "Hello everyone" in txt
        assert "[00:00]" in txt

    def test_export_srt(self, completed_record):
        srt = export_srt(completed_record)
        assert "1\n" in srt
        assert "00:00:00,000 --> 00:00:02,500" in srt
        assert "Hello everyone." in srt

    def test_export_vtt(self, completed_record):
        vtt = export_vtt(completed_record)
        assert vtt.startswith("WEBVTT")
        assert "00:00:00.000 --> 00:00:02.500" in vtt

    def test_export_json(self, completed_record):
        j = export_json(completed_record)
        data = json.loads(j)
        assert data["title"] == "Sprint Review"
        assert len(data["segments"]) == 2

    def test_export_srt_empty(self):
        srt = export_srt({"segments_json": []})
        assert srt == ""


# ── API Tests ───────────────────────────────────────────────────────────

class TestAPI:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"

    def test_settings(self, client):
        resp = client.get("/api/settings")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "model_size" in data
        assert "available_models" in data

    def test_dashboard(self, client):
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_recordings" in data

    def test_history_empty(self, client):
        resp = client.get("/api/history")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["count"] == 0

    def test_upload_no_file(self, client):
        resp = client.post("/api/transcribe")
        assert resp.status_code == 400

    def test_get_nonexistent(self, client):
        resp = client.get("/api/transcription/99999")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/history/99999")
        assert resp.status_code == 404

    def test_export_nonexistent(self, client):
        resp = client.get("/api/export/99999/txt")
        assert resp.status_code == 404

    def test_search_empty_query(self, client):
        resp = client.get("/api/history/search")
        assert resp.status_code == 400

    def test_model_info(self, client):
        resp = client.get("/api/model/info")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "available_models" in data
