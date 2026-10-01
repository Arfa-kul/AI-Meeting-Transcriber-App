import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileAudio, Trash2, Download, Clock,
  ArrowRight, AlertCircle
} from 'lucide-react';
import { getHistory, searchHistory, deleteTranscription, getExportUrl } from '../services/api';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateStr; }
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const data = await getHistory();
      setRecords(data.transcriptions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }
    try {
      setLoading(true);
      const data = await searchHistory(searchQuery);
      setRecords(data.transcriptions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteTranscription(deleteId);
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err.message);
      setDeleteId(null);
    }
  }

  const statusBadge = (status) => {
    const cls = status === 'completed' ? 'badge-success'
      : status === 'processing' ? 'badge-warning'
      : status === 'error' ? 'badge-error'
      : 'badge-pending';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Transcription History</h2>
        <p>Browse, search, and manage your past transcriptions</p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={18} className="search-bar-icon" />
          <input
            type="text"
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="btn btn-secondary" onClick={handleSearch}>Search</button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'var(--error-bg)', borderRadius: 'var(--radius-sm)',
          color: 'var(--error)', fontSize: 13
        }}>
          {error}
        </div>
      )}

      {/* List */}
      {records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileAudio size={36} /></div>
            <div className="empty-state-title">
              {searchQuery ? 'No results found' : 'No transcriptions yet'}
            </div>
            <div className="empty-state-text">
              {searchQuery
                ? 'Try a different search term.'
                : 'Upload your first audio file to get started.'}
            </div>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => navigate('/transcribe')}>
                New Transcription
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="history-list">
          {records.map(item => (
            <div key={item.id} className="history-item">
              <div
                className="history-item-icon"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/results/${item.id}`)}
              >
                <FileAudio size={20} />
              </div>
              <div
                className="history-item-info"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/results/${item.id}`)}
              >
                <div className="history-item-title">{item.title}</div>
                <div className="history-item-meta">
                  <span><Clock size={12} /> {formatDate(item.created_at)}</span>
                  <span>{formatDuration(item.audio_duration)}</span>
                  <span>{formatFileSize(item.file_size)}</span>
                  {statusBadge(item.status)}
                </div>
              </div>
              <div className="history-item-actions">
                {item.status === 'completed' && (
                  <button
                    className="btn btn-ghost btn-icon"
                    title="Download TXT"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(getExportUrl(item.id, 'txt'), '_blank');
                    }}
                  >
                    <Download size={16} />
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-icon"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(item.id);
                  }}
                  style={{ color: 'var(--error)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} color="var(--error)" />
              Delete Transcription
            </h3>
            <p>
              Are you sure you want to delete this transcription? This will permanently
              remove the transcript, summary, and uploaded audio file.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
