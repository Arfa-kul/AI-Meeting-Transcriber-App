import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';

const ALLOWED_EXTENSIONS = [
  '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.wma',
  '.aac', '.opus', '.webm', '.mp4', '.mkv', '.avi'
];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UploadZone({ onFileSelected, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateFile = useCallback((file) => {
    setError('');
    if (!file) return false;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported format "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }

    const maxSize = 500 * 1024 * 1024; // 500 MB
    if (file.size > maxSize) {
      setError(`File too large (${formatFileSize(file.size)}). Max: 500 MB.`);
      return false;
    }

    if (file.size === 0) {
      setError('File is empty.');
      return false;
    }

    return true;
  }, []);

  const handleFile = useCallback((file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  }, [validateFile, onFileSelected]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError('');
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        <div className="upload-zone-icon">
          <Upload size={28} />
        </div>
        <div className="upload-zone-title">
          Drop your audio file here or click to browse
        </div>
        <div className="upload-zone-subtitle">
          Supports MP3, WAV, M4A, OGG, FLAC, and more — up to 500 MB
        </div>
        <div className="upload-zone-formats">
          {['MP3', 'WAV', 'M4A', 'OGG', 'FLAC', 'AAC', 'WEBM', 'MP4'].map(f => (
            <span key={f} className="format-badge">{f}</span>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 13
        }}>
          {error}
        </div>
      )}

      {selectedFile && !error && (
        <div className="file-chip">
          <div className="file-chip-icon">
            <FileAudio size={20} />
          </div>
          <div className="file-chip-info">
            <div className="file-chip-name">{selectedFile.name}</div>
            <div className="file-chip-size">{formatFileSize(selectedFile.size)}</div>
          </div>
          {!disabled && (
            <div className="file-chip-remove" onClick={clearFile}>
              <X size={18} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
