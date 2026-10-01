import React, { useState, useMemo } from 'react';
import { Search, Copy, Check } from 'lucide-react';

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function highlightText(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i}>{part}</mark>
      : part
  );
}

export default function TranscriptViewer({ segments = [], fullText = '' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredSegments = useMemo(() => {
    if (!searchQuery) return segments;
    return segments.filter(s =>
      s.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [segments, searchQuery]);

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    return segments.filter(s =>
      s.text.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
  }, [segments, searchQuery]);

  const handleCopy = async () => {
    const text = segments.length > 0
      ? segments.map(s => `[${formatTimestamp(s.start)}] ${s.text}`).join('\n')
      : fullText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!segments.length && !fullText) {
    return (
      <div className="empty-state" style={{ padding: 32 }}>
        <p style={{ color: 'var(--text-muted)' }}>No transcript available.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search & Copy toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={18} className="search-bar-icon" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {searchQuery && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {matchCount} segment{matchCount !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Segments */}
      <div className="transcript-viewer">
        {segments.length > 0 ? (
          filteredSegments.map((seg, idx) => (
            <div key={seg.id ?? idx} className="segment">
              <span className="segment-time">{formatTimestamp(seg.start)}</span>
              <span className="segment-text">
                {highlightText(seg.text, searchQuery)}
              </span>
            </div>
          ))
        ) : (
          <div style={{ padding: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {fullText}
          </div>
        )}
      </div>
    </div>
  );
}
