import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileAudio, Clock, BarChart3, Mic,
  ArrowRight, TrendingUp, Zap
} from 'lucide-react';
import { getDashboard } from '../services/api';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await getDashboard();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Zap size={36} /></div>
        <div className="empty-state-title">Connection Error</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-primary" onClick={loadDashboard}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your meeting transcriptions and activity</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><FileAudio size={24} /></div>
          <div>
            <div className="stat-value">{stats?.total_recordings || 0}</div>
            <div className="stat-label">Total Recordings</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Clock size={24} /></div>
          <div>
            <div className="stat-value">{formatDuration(stats?.total_audio_duration || 0)}</div>
            <div className="stat-label">Audio Processed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><BarChart3 size={24} /></div>
          <div>
            <div className="stat-value">{stats?.completed_recordings || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TrendingUp size={24} /></div>
          <div>
            <div className="stat-value">{stats?.processing_recordings || 0}</div>
            <div className="stat-label">Processing</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              Ready to transcribe?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Upload your meeting recording and get AI-powered transcriptions with summaries.
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/transcribe')}>
            <Mic size={20} />
            New Transcription
          </button>
        </div>
      </div>

      {/* Recent Transcriptions */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Transcriptions</div>
            <div className="card-subtitle">Your latest processed recordings</div>
          </div>
          {stats?.recent_transcriptions?.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
              View All <ArrowRight size={14} />
            </button>
          )}
        </div>

        {!stats?.recent_transcriptions?.length ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileAudio size={36} /></div>
            <div className="empty-state-title">No transcriptions yet</div>
            <div className="empty-state-text">
              Upload your first audio file to get started with AI-powered transcription.
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/transcribe')}>
              <Mic size={16} /> Start Transcribing
            </button>
          </div>
        ) : (
          <div className="history-list">
            {stats.recent_transcriptions.map(item => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => navigate(`/results/${item.id}`)}
              >
                <div className="history-item-icon">
                  <FileAudio size={20} />
                </div>
                <div className="history-item-info">
                  <div className="history-item-title">{item.title}</div>
                  <div className="history-item-meta">
                    <span>{formatDate(item.created_at)}</span>
                    <span>{formatDuration(item.audio_duration)}</span>
                    <span className={`badge badge-${item.status === 'completed' ? 'success' : item.status === 'error' ? 'error' : 'warning'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
