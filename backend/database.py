"""
Database module — SQLite setup, schema creation, and CRUD operations.
"""

import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
import config


def get_connection():
    """Create a database connection with row factory."""
    conn = sqlite3.connect(str(config.DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS transcriptions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_size       INTEGER DEFAULT 0,
            audio_duration  REAL DEFAULT 0.0,
            upload_date     TEXT NOT NULL,
            language_detected TEXT DEFAULT '',
            language_selected TEXT DEFAULT '',
            model_size      TEXT DEFAULT 'base',
            transcript_text TEXT DEFAULT '',
            segments_json   TEXT DEFAULT '[]',
            summary         TEXT DEFAULT '',
            action_items    TEXT DEFAULT '[]',
            status          TEXT DEFAULT 'pending',
            progress        REAL DEFAULT 0.0,
            error_message   TEXT DEFAULT '',
            processing_duration REAL DEFAULT 0.0,
            word_timestamps INTEGER DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_transcriptions_status
            ON transcriptions(status);
        CREATE INDEX IF NOT EXISTS idx_transcriptions_created
            ON transcriptions(created_at DESC);
    """)

    conn.commit()
    conn.close()


# ── CRUD helpers ────────────────────────────────────────────────────────

def create_transcription(data: dict) -> int:
    """Insert a new transcription record and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO transcriptions
            (title, original_filename, stored_filename, file_size,
             audio_duration, upload_date, language_selected, model_size,
             status, word_timestamps, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    """, (
        data.get("title", ""),
        data.get("original_filename", ""),
        data.get("stored_filename", ""),
        data.get("file_size", 0),
        data.get("audio_duration", 0.0),
        now,
        data.get("language_selected", ""),
        data.get("model_size", "base"),
        data.get("word_timestamps", 0),
        now, now
    ))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id


def update_transcription(record_id: int, data: dict):
    """Update fields on a transcription record."""
    conn = get_connection()
    cursor = conn.cursor()
    fields = []
    values = []
    for key, value in data.items():
        fields.append(f"{key} = ?")
        if isinstance(value, (dict, list)):
            values.append(json.dumps(value))
        else:
            values.append(value)
    fields.append("updated_at = ?")
    values.append(datetime.now(timezone.utc).isoformat())
    values.append(record_id)

    sql = f"UPDATE transcriptions SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(sql, values)
    conn.commit()
    conn.close()


def get_transcription(record_id: int) -> dict | None:
    """Fetch a single transcription by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transcriptions WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        return None
    return _row_to_dict(row)


def get_all_transcriptions(limit: int = 50, offset: int = 0) -> list[dict]:
    """Fetch transcriptions ordered by creation date (newest first)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM transcriptions ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset)
    )
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def delete_transcription(record_id: int) -> bool:
    """Delete a transcription record. Returns True if a row was deleted."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transcriptions WHERE id = ?", (record_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_dashboard_stats() -> dict:
    """Aggregate statistics for the dashboard."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM transcriptions")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COALESCE(SUM(audio_duration), 0) FROM transcriptions")
    total_duration = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM transcriptions WHERE status = 'completed'"
    )
    completed = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM transcriptions WHERE status = 'processing'"
    )
    processing = cursor.fetchone()[0]

    cursor.execute(
        "SELECT * FROM transcriptions ORDER BY created_at DESC LIMIT 5"
    )
    recent = [_row_to_dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "total_recordings": total,
        "completed_recordings": completed,
        "processing_recordings": processing,
        "total_audio_duration": round(total_duration, 1),
        "recent_transcriptions": recent,
    }


def search_transcriptions(query: str) -> list[dict]:
    """Search transcriptions by title or transcript text."""
    conn = get_connection()
    cursor = conn.cursor()
    pattern = f"%{query}%"
    cursor.execute(
        """SELECT * FROM transcriptions
           WHERE title LIKE ? OR transcript_text LIKE ? OR original_filename LIKE ?
           ORDER BY created_at DESC LIMIT 50""",
        (pattern, pattern, pattern)
    )
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


# ── Helpers ─────────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict:
    """Convert a sqlite3.Row to a dict, parsing JSON fields."""
    d = dict(row)
    for field in ("segments_json", "action_items"):
        if field in d and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                d[field] = []
    return d
