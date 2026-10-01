import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, RefreshCw, Clock, Globe,
  Cpu, FileText, ChevronDown
} from 'lucide-react';
import TranscriptViewer from '../components/TranscriptViewer';
import SummaryView from '../components/SummaryView';
import { getTranscription, getExportUrl, regenerateSummary } from '../services/api';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [showExport, setShowExport] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadResult();
  }, [id]);

  async function loadResult() {
    try {
      setLoading(true);
      const result = await getTranscription(id);
      setData(result);
      // If no summary, default to transcript tab
      if (!result.summary || (typeof result.summary === 'object' && !result.summary.overview)) {
        setActiveTab('transcript');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const result = await regenerateSummary(id);
      setData(prev => ({ ...prev, summary: result.summary }));
      setActiveTab('summary');
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  }

  const handleExport = (format) => {
    window.open(getExportUrl(id, format), '_blank');
    setShowExport(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading transcription...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Error</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/history')}>
          Go to History
        </button>
      </div>
    );
  }

  if (!data) return null;

  const segments = data.segments_json || [];
  const summary = data.summary || {};

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{data.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {data.original_filename}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw size={14} className={regenerating ? 'spinning' : ''} />
            {regenerating ? 'Regenerating...' : 'Regenerate Summary'}
          </button>
          <div className="dropdown">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowExport(!showExport)}
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} />
            </button>
            {showExport && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => handleExport('txt')}>
                  <FileText size={14} /> Plain Text (.txt)
                </button>
                <button className="dropdown-item" onClick={() => handleExport('srt')}>
                  <FileText size={14} /> Subtitles (.srt)
                </button>
                <button className="dropdown-item" onClick={() => handleExport('vtt')}>
                  <FileText size={14} /> WebVTT (.vtt)
                </button>
                <button className="dropdown-item" onClick={() => handleExport('json')}>
                  <FileText size={14} /> JSON (.json)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon purple" style={{ width: 36, height: 36 }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{formatDuration(data.audio_duration)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Audio Duration</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon green" style={{ width: 36, height: 36 }}>
            <Globe size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{data.language_detected || 'Unknown'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Language</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon blue" style={{ width: 36, height: 36 }}>
            <Cpu size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{data.model_size || 'base'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Model</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: 16 }}>
          <div className="stat-icon orange" style={{ width: 36, height: 36 }}>
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{segments.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Segments</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`tab ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            Full Transcript
          </button>
        </div>

        {activeTab === 'summary' ? (
          <SummaryView summary={summary} />
        ) : (
          <TranscriptViewer segments={segments} fullText={data.transcript_text} />
        )}
      </div>
    </div>
  );
}
