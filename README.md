# 🎙️ MeetScribe AI — AI Meeting Transcriber & Smart Notes Generator

> Transform meeting recordings into intelligent transcripts, structured summaries, and actionable insights using AI-powered speech recognition.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-green?logo=flask)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Whisper](https://img.shields.io/badge/faster--whisper-1.0-orange)

---

## 📋 Problem Statement

Meetings, lectures, and interviews generate valuable information that is often lost because manual note-taking is incomplete, biased, and time-consuming. Existing transcription tools are either expensive, cloud-dependent, or lack intelligent summarization capabilities.

## 💡 Proposed Solution

**MeetScribe AI** is a full-stack web application that processes audio recordings locally using the `faster-whisper` speech recognition engine. It automatically detects spoken language, generates timestamped transcripts, and produces structured meeting summaries with action items — all running on a student laptop without requiring cloud services or paid subscriptions.

---

## ✨ Features

### Core Capabilities
- **Audio Upload** — Drag-and-drop or browse for MP3, WAV, M4A, OGG, FLAC, and more
- **Speech-to-Text** — Powered by faster-whisper with multiple model sizes
- **Language Detection** — Automatic detection of 99+ languages
- **Word-Level Timestamps** — Optional per-word timing for precise alignment
- **Voice Activity Detection** — Filters silent sections automatically

### AI Meeting Summary
- Meeting overview
- Key discussion points
- Important decisions
- Action items with assignees and deadlines
- Follow-up questions
- LLM-powered (Gemini/OpenAI) or extractive fallback

### Interactive Transcript
- Timestamped segment display
- Full-text search with highlighting
- One-click copy to clipboard
- Summary and transcript tabs

### Export & Download
- **TXT** — Plain text with timestamps
- **SRT** — Subtitle format
- **VTT** — WebVTT subtitle format
- **JSON** — Structured data with segments and metadata

### Dashboard & History
- Total recordings and audio duration statistics
- Recent transcriptions with quick access
- Full searchable history
- Delete individual recordings

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                     │
│  Dashboard │ Transcribe │ Results │ History │ Settings        │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API (JSON)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     Flask Backend (Python)                     │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Transcription│  │  Summarization   │  │    Export       │  │
│  │   Service    │  │    Service       │  │    Service      │  │
│  │ (faster-     │  │ (LLM / Extract.) │  │ (TXT/SRT/VTT/  │  │
│  │  whisper)    │  │                  │  │  JSON)          │  │
│  └──────┬───────┘  └───────┬──────────┘  └────────────────┘  │
│         │                  │                                  │
│  ┌──────▼──────────────────▼──────────────────────────────┐  │
│  │              SQLite Database (transcriptions.db)        │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Speech Recognition** | faster-whisper | 4x faster than OpenAI Whisper, CTranslate2 optimized, INT8 CPU support |
| **Backend** | Flask (Python) | Lightweight, ideal for REST APIs, great ecosystem |
| **Database** | SQLite | Zero-configuration, serverless, perfect for single-user apps |
| **Frontend** | React + Vite | Fast HMR, component-based UI, modern tooling |
| **Summarization** | Gemini / OpenAI (optional) | Intelligent summaries when available, extractive fallback |
| **Icons** | Lucide React | Consistent, lightweight icon library |

---

## 📦 Project Structure

```
project/
├── backend/
│   ├── app.py                    # Flask application entry point
│   ├── config.py                 # Environment-based configuration
│   ├── database.py               # SQLite CRUD operations
│   ├── transcription_service.py  # faster-whisper integration
│   ├── summarization_service.py  # LLM + extractive summarization
│   ├── export_service.py         # TXT/SRT/VTT/JSON export
│   ├── requirements.txt          # Python dependencies
│   ├── routes/
│   │   ├── transcription_routes.py
│   │   ├── history_routes.py
│   │   └── export_routes.py
│   ├── utils/
│   │   └── file_validation.py
│   └── tests/
│       └── test_app.py
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css              # Complete design system
│       ├── services/
│       │   └── api.js             # Backend API client
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── UploadZone.jsx
│       │   ├── TranscriptViewer.jsx
│       │   └── SummaryView.jsx
│       └── pages/
│           ├── DashboardPage.jsx
│           ├── TranscribePage.jsx
│           ├── ResultsPage.jsx
│           ├── HistoryPage.jsx
│           └── SettingsPage.jsx
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd "AI Meeting Transcriber and Smart Notes Generator"
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy and configure environment variables
copy ..\.env.example .env
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
```

### 4. Start the Application

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
python app.py
```
The API server starts at `http://localhost:5000`.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
The UI opens at `http://localhost:5173`.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL_SIZE` | `base` | Model: tiny, base, small, medium, large-v3 |
| `WHISPER_DEVICE` | `cpu` | Device: cpu or cuda |
| `WHISPER_COMPUTE_TYPE` | `int8` | Precision: int8, float16, float32 |
| `MAX_FILE_SIZE_MB` | `500` | Maximum upload size in MB |
| `LLM_API_KEY` | _(empty)_ | API key for AI summarization (optional) |
| `LLM_PROVIDER` | `gemini` | LLM provider: gemini or openai |
| `LLM_API_URL` | Gemini URL | API endpoint URL |
| `FLASK_PORT` | `5000` | Backend server port |
| `FLASK_DEBUG` | `true` | Debug mode |

---

## 📖 How to Use

1. **Open the app** at `http://localhost:5173`
2. Click **New Transcription** in the sidebar
3. **Drag & drop** an audio file or click to browse
4. Choose a **model size** and **language** (or auto-detect)
5. Click **Start Transcription** — wait for processing
6. View the **Summary** tab for key insights
7. Switch to **Full Transcript** for the complete text
8. **Export** as TXT, SRT, VTT, or JSON
9. Find past recordings in **History**

---

## 🗄️ Database

- **Location:** `backend/data/transcriptions.db`
- **Engine:** SQLite with WAL journaling
- **Schema:** Single `transcriptions` table storing all metadata, transcripts, and summaries
- Automatically created on first run

---

## ⚠️ Known Limitations

1. **First-run model download** — The whisper model downloads on first use (~145 MB for base). Be patient.
2. **CPU performance** — Transcription speed depends on CPU. A 5-minute audio may take 2-5 minutes on a laptop.
3. **No GPU acceleration on Windows CPU builds** — Use `WHISPER_DEVICE=cpu` unless you have CUDA configured.
4. **Single-user** — No authentication or multi-user support.
5. **LLM summarization** requires an API key — falls back to extractive method otherwise.
6. **Large files** — Very long recordings (>1 hour) may use significant memory.

---

## 🔮 Future Enhancements

- [ ] Speaker diarization (who said what)
- [ ] Real-time microphone transcription
- [ ] Multi-language transcript translation
- [ ] User authentication and team sharing
- [ ] WebSocket-based live progress updates
- [ ] PDF export with formatted summaries
- [ ] Calendar integration for scheduling
- [ ] Keyword and topic extraction
- [ ] Sentiment analysis per segment

---

## 🧪 Testing

```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

Tests cover:
- Database CRUD operations
- File validation logic
- Export format correctness
- API endpoint responses
- Error handling scenarios

---

## 🎤 How faster-whisper Works

**faster-whisper** is a reimplementation of OpenAI's Whisper model using CTranslate2, which provides:

1. **Model Loading** — The Whisper model is downloaded once and cached in `backend/models/`. Subsequent runs reuse the cached model.
2. **Audio Processing** — Audio is preprocessed and fed through the Whisper encoder-decoder architecture.
3. **Voice Activity Detection (VAD)** — Silero VAD filters out silent segments before transcription, improving speed and accuracy.
4. **Beam Search** — The decoder uses beam search (beam_size=5) to find the most likely text for each audio segment.
5. **Language Detection** — The model analyzes the first 30 seconds to identify the spoken language.
6. **Segmentation** — Output is divided into timestamped segments with confidence scores.

Performance comparison:
| Feature | OpenAI Whisper | faster-whisper |
|---------|---------------|----------------|
| Speed | 1x | **4x faster** |
| Memory | Full precision | **INT8 quantization** |
| CPU Support | Limited | **Optimized** |
| Python API | Basic | **Rich streaming API** |

---

## 🎓 Two-Minute Project Explanation

> *"MeetScribe AI is a web application that converts meeting recordings into text using AI speech recognition. I built a Python Flask backend that uses the faster-whisper library — a high-performance implementation of OpenAI's Whisper model — to transcribe audio files. The system automatically detects the spoken language, generates timestamped transcripts, and produces structured meeting summaries with action items.*
>
> *The React frontend provides a professional interface with drag-and-drop upload, real-time progress tracking, an interactive transcript viewer with search, and export in multiple formats including SRT subtitles. All data is stored in SQLite, and transcription runs in background threads so the server remains responsive.*
>
> *What makes this project interesting is the modular summarization layer — it uses an LLM API like Gemini when available, but falls back to extractive summarization so the app works fully offline. The faster-whisper engine runs with INT8 quantization on CPU, making it practical for a laptop without a GPU."*

---

## ❓ Possible Viva Questions & Answers

**Q1: Why did you choose faster-whisper over OpenAI's Whisper?**
> faster-whisper uses CTranslate2 for 4x speedup and 2x less memory. It supports INT8 quantization for CPU, making it feasible on a student laptop. The Python API also supports streaming segments, which enables progress tracking.

**Q2: How does the transcription pipeline work?**
> The user uploads an audio file → Flask saves it and creates a DB record → A background thread loads the Whisper model (cached after first use) → The model transcribes with VAD filtering → Segments are saved to SQLite → The summarization service processes the text → The frontend polls for status and displays results.

**Q3: What is Voice Activity Detection (VAD)?**
> VAD uses the Silero model to detect speech vs. silence in the audio. By filtering out silent sections before transcription, we reduce processing time and avoid generating text for non-speech segments.

**Q4: How does the summarization work without an API key?**
> The extractive fallback analyzes the transcript for signal words (e.g., "decided", "action", "deadline") and extracts relevant sentences. It identifies questions, deadlines, and action items using pattern matching. It's simpler than LLM summarization but works fully offline.

**Q5: How do you handle large files and long processing times?**
> Transcription runs in a background thread using Python's threading module. The frontend polls the `/api/transcription/{id}/status` endpoint every 2 seconds for progress updates. The model is loaded once and reused across requests.

**Q6: How is the database designed?**
> A single SQLite table `transcriptions` stores everything — metadata (title, filename, duration), the full transcript text, JSON-encoded segments with timestamps, the summary, and processing status. SQLite uses WAL journal mode for concurrent read access.

**Q7: What security measures are implemented?**
> Files are validated for type and size before saving. Filenames are sanitized using a `recording_{id}` pattern. Uploaded files are never executed. The upload directory is separate from application code. API keys are read from environment variables, never hardcoded.

**Q8: What are the export formats?**
> TXT (plain text with timestamps), SRT (SubRip subtitles for video players), VTT (WebVTT for HTML5 video), and JSON (structured data for programmatic use). Each format has proper timestamp formatting.

**Q9: How would you scale this for multiple users?**
> Add user authentication (JWT), switch from SQLite to PostgreSQL, use Celery with Redis for background task queues instead of threads, deploy with Docker, and add WebSocket support for real-time progress.

**Q10: What is INT8 quantization?**
> INT8 reduces the model's numerical precision from 32-bit floating point to 8-bit integers. This cuts memory usage by ~4x and speeds up computation on CPUs that support integer arithmetic, with minimal impact on accuracy.

---

## 📄 License

This project is created for educational purposes as a final-year Computer Science project.
