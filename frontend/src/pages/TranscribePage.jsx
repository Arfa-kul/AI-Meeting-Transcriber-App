import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Sparkles, Settings2 } from 'lucide-react';
import UploadZone from '../components/UploadZone';
import { uploadAndTranscribe, getTranscriptionStatus } from '../services/api';

const LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'tr', label: 'Turkish' },
  { value: 'pl', label: 'Polish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'uk', label: 'Ukrainian' },
];

const MODELS = [
  { value: 'tiny', label: 'Tiny (~75 MB) — Fastest, lower quality' },
  { value: 'base', label: 'Base (~145 MB) — Fast, good quality' },
  { value: 'small', label: 'Small (~480 MB) — Moderate, better quality' },
  { value: 'medium', label: 'Medium (~1.5 GB) — Slower, high quality' },
  { value: 'large-v3', label: 'Large-v3 (~3 GB) — Slowest, highest quality' },
];

export default function TranscribePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('');
  const [modelSize, setModelSize] = useState('base');
  const [wordTimestamps, setWordTimestamps] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState('');

  const onFileSelected = useCallback((f) => {
    setFile(f);
    setError('');
    if (f && !title) {
      const name = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(name);
    }
  }, [title]);

  const pollStatus = useCallback(async (id) => {
    try {
      const status = await getTranscriptionStatus(id);
      setProgress(status.progress || 0);

      if (status.status === 'completed') {
        setStatusText('Transcription complete! Redirecting...');
        setProgress(100);
        setTimeout(() => navigate(`/results/${id}`), 1000);
        return;
      }

      if (status.status === 'error') {
        setError(status.error_message || 'Transcription failed.');
        setUploading(false);
        return;
      }

      // Still processing
      if (status.progress < 15) {
        setStatusText('Loading speech recognition model...');
      } else if (status.progress < 85) {
        setStatusText(`Transcribing audio... ${Math.round(status.progress)}%`);
      } else {
        setStatusText('Generating summary...');
      }

      setTimeout(() => pollStatus(id), 2000);
    } catch (err) {
      // Retry on network error
      setTimeout(() => pollStatus(id), 3000);
    }
  }, [navigate]);

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select an audio file.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);
    setStatusText('Uploading file...');

    try {
      const result = await uploadAndTranscribe(file, {
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        language,
        model_size: modelSize,
        word_timestamps: wordTimestamps,
      });

      setRecordId(result.record_id);
      setProgress(5);
      setStatusText('Upload complete. Starting transcription...');
      pollStatus(result.record_id);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>New Transcription</h2>
        <p>Upload an audio file to transcribe with AI-powered speech recognition</p>
      </div>

      {/* Upload Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <UploadZone onFileSelected={onFileSelected} disabled={uploading} />
      </div>

      {/* Options */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Recording Title</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g., Sprint Planning — Oct 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label className="form-label">Language</label>
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={uploading}
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label className="form-label">Model Size</label>
            <select
              className="form-select"
              value={modelSize}
              onChange={(e) => setModelSize(e.target.value)}
              disabled={uploading}
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowOptions(!showOptions)}
          style={{ marginBottom: showOptions ? 16 : 0 }}
        >
          <Settings2 size={14} />
          {showOptions ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showOptions && (
          <div style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={wordTimestamps}
                onChange={(e) => setWordTimestamps(e.target.checked)}
                disabled={uploading}
              />
              Enable word-level timestamps (slower but more detailed)
            </label>
          </div>
        )}
      </div>

      {/* Progress */}
      {uploading && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="spinner" />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{statusText}</span>
          </div>
          <div className="progress-container" style={{ margin: 0 }}>
            <div className="progress-header">
              <span className="progress-label">Processing</span>
              <span className="progress-value">{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {progress < 20 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              First-time model download may take a few minutes. Subsequent runs will be faster.
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '14px 18px', marginBottom: 24,
          background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Submit Button */}
      {!uploading && (
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={!file}
          style={{ width: '100%' }}
        >
          <Sparkles size={20} />
          Start Transcription
        </button>
      )}
    </div>
  );
}
