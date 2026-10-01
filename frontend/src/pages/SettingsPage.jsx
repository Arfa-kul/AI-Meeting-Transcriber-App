import React, { useState, useEffect } from 'react';
import {
  Cpu, HardDrive, Key, Info, RefreshCw,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { getSettings, getModelInfo, preloadModel } from '../services/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preloading, setPreloading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const [settingsData, modelData] = await Promise.all([
        getSettings(),
        getModelInfo()
      ]);
      setSettings(settingsData);
      setModelInfo(modelData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreload(size) {
    setPreloading(true);
    setMessage('');
    try {
      await preloadModel(size);
      setMessage(`Model "${size}" is being loaded in the background. This may take a moment.`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setPreloading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure your transcription engine and preferences</p>
      </div>

      <div className="settings-grid">
        {/* Model Configuration */}
        <div className="settings-card">
          <div className="settings-card-title">
            <Cpu size={18} style={{ color: 'var(--accent-primary)' }} />
            Speech Recognition Engine
          </div>
          <div className="setting-row">
            <span className="setting-label">Engine</span>
            <span className="setting-value">faster-whisper</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Default Model</span>
            <span className="setting-value">{settings?.model_size || 'base'}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Device</span>
            <span className="setting-value">{settings?.device || 'cpu'}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Compute Type</span>
            <span className="setting-value">{settings?.compute_type || 'int8'}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Model Loaded</span>
            <span className="setting-value">
              {modelInfo?.loaded ? (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} /> {modelInfo.model_size}
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Not loaded yet</span>
              )}
            </span>
          </div>
        </div>

        {/* Available Models */}
        <div className="settings-card">
          <div className="settings-card-title">
            <HardDrive size={18} style={{ color: 'var(--accent-primary)' }} />
            Available Models
          </div>
          {settings?.available_models && Object.entries(settings.available_models).map(([name, info]) => (
            <div key={name} className="setting-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="setting-value">{name}</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {info.size} · {info.speed} · {info.quality}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handlePreload(name)}
                disabled={preloading}
              >
                {preloading ? <RefreshCw size={12} className="spinning" /> : 'Load'}
              </button>
            </div>
          ))}
          {message && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)',
              color: 'var(--info)', fontSize: 12
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Summarization */}
        <div className="settings-card">
          <div className="settings-card-title">
            <Key size={18} style={{ color: 'var(--accent-primary)' }} />
            AI Summarization
          </div>
          <div className="setting-row">
            <span className="setting-label">LLM API</span>
            <span className="setting-value">
              {settings?.llm_configured ? (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} /> {settings.llm_provider}
                </span>
              ) : (
                <span style={{ color: 'var(--warning)' }}>Not configured</span>
              )}
            </span>
          </div>
          <div style={{
            marginTop: 12, padding: 14,
            background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6
          }}>
            {settings?.llm_configured ? (
              <p>LLM-powered summarization is active. Summaries will include AI-generated overviews, action items, and key decisions.</p>
            ) : (
              <div>
                <p style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>No API key configured.</strong>
                </p>
                <p>The app will use basic extractive summarization. For AI-powered summaries, set the <code style={{ color: 'var(--accent-primary)' }}>LLM_API_KEY</code> environment variable in the backend.</p>
                <p style={{ marginTop: 8 }}>Supported providers: Gemini, OpenAI</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Settings */}
        <div className="settings-card">
          <div className="settings-card-title">
            <Info size={18} style={{ color: 'var(--accent-primary)' }} />
            Upload Settings
          </div>
          <div className="setting-row">
            <span className="setting-label">Max File Size</span>
            <span className="setting-value">{settings?.max_file_size_mb || 500} MB</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Supported Formats</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {settings?.allowed_extensions?.slice(0, 8).map(ext => (
                <span key={ext} className="format-badge">{ext}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables Guide */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Environment Variables</div>
        <div style={{
          background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
          padding: 16, fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 2, overflowX: 'auto'
        }}>
          <div><span style={{ color: 'var(--success)' }}>WHISPER_MODEL_SIZE</span>=base</div>
          <div><span style={{ color: 'var(--success)' }}>WHISPER_DEVICE</span>=cpu</div>
          <div><span style={{ color: 'var(--success)' }}>WHISPER_COMPUTE_TYPE</span>=int8</div>
          <div><span style={{ color: 'var(--success)' }}>MAX_FILE_SIZE_MB</span>=500</div>
          <div><span style={{ color: 'var(--warning)' }}>LLM_API_KEY</span>=your_api_key_here</div>
          <div><span style={{ color: 'var(--warning)' }}>LLM_PROVIDER</span>=gemini</div>
          <div><span style={{ color: 'var(--warning)' }}>LLM_API_URL</span>=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent</div>
        </div>
      </div>
    </div>
  );
}
