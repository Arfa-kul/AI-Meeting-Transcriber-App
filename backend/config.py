"""
Application Configuration
Manages all settings via environment variables with sensible defaults.
"""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).parent.resolve()
UPLOAD_DIR = BASE_DIR / "uploads"
DATABASE_DIR = BASE_DIR / "data"
MODEL_CACHE_DIR = BASE_DIR / "models"

# Ensure directories exist
UPLOAD_DIR.mkdir(exist_ok=True)
DATABASE_DIR.mkdir(exist_ok=True)
MODEL_CACHE_DIR.mkdir(exist_ok=True)

# Database
DATABASE_PATH = DATABASE_DIR / "transcriptions.db"

# Upload settings
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".wma",
    ".aac", ".opus", ".webm", ".mp4", ".mkv", ".avi"
}

# Whisper model settings
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_DOWNLOAD_ROOT = str(MODEL_CACHE_DIR)

# Available model sizes for the UI
AVAILABLE_MODELS = {
    "tiny":   {"size": "~75 MB",  "speed": "Fastest",  "quality": "Lower",   "vram": "~1 GB"},
    "base":   {"size": "~145 MB", "speed": "Fast",     "quality": "Good",    "vram": "~1 GB"},
    "small":  {"size": "~480 MB", "speed": "Moderate", "quality": "Better",  "vram": "~2 GB"},
    "medium": {"size": "~1.5 GB", "speed": "Slower",   "quality": "High",    "vram": "~5 GB"},
    "large-v3": {"size": "~3 GB", "speed": "Slowest",  "quality": "Highest", "vram": "~10 GB"},
}

# Summarization
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")  # gemini, openai

# Flask
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
