"""
File validation utilities for uploaded audio files.
"""

import os
from pathlib import Path
from config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB


class ValidationError(Exception):
    """Custom exception for file validation errors."""
    pass


def validate_file(file_storage) -> dict:
    """
    Validate an uploaded file. Returns metadata dict on success,
    raises ValidationError on failure.
    """
    if file_storage is None or file_storage.filename == "":
        raise ValidationError("No file was uploaded. Please select an audio file.")

    filename = file_storage.filename
    ext = Path(filename).suffix.lower()

    # Check extension
    if ext not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise ValidationError(
            f"Unsupported file type '{ext}'. "
            f"Allowed formats: {allowed}"
        )

    # Check file size (read content length from stream)
    file_storage.seek(0, os.SEEK_END)
    file_size = file_storage.tell()
    file_storage.seek(0)

    if file_size == 0:
        raise ValidationError("The uploaded file is empty (0 bytes).")

    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            f"File is too large ({file_size / (1024*1024):.1f} MB). "
            f"Maximum allowed size is {MAX_FILE_SIZE_MB} MB."
        )

    return {
        "original_filename": filename,
        "extension": ext,
        "file_size": file_size,
    }


def generate_safe_filename(original: str, record_id: int) -> str:
    """Generate a safe, unique filename for storage."""
    ext = Path(original).suffix.lower()
    safe_name = f"recording_{record_id}{ext}"
    return safe_name


def get_audio_duration(filepath: str) -> float:
    """
    Attempt to get audio duration using mutagen. Falls back to 0.0 if
    mutagen is not installed or the file format is not recognized.
    """
    try:
        from mutagen import File as MutagenFile
        audio = MutagenFile(filepath)
        if audio is not None and audio.info is not None:
            return round(audio.info.length, 2)
    except Exception:
        pass
    return 0.0
