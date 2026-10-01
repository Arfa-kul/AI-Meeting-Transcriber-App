import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Mic, History, Settings, FileAudio,
  Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transcribe', label: 'New Transcription', icon: Mic },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="btn btn-ghost btn-icon" onClick={onToggle} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          <div className="sidebar-brand-icon"><FileAudio size={18} color="white" /></div>
          <span style={{ fontWeight: 700, fontSize: 15, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MeetScribe AI
          </span>
        </div>
      </div>

      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onToggle} />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <FileAudio size={20} color="white" />
          </div>
          <div>
            <h1>MeetScribe AI</h1>
            <span>Smart Meeting Notes</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (window.innerWidth < 768) onToggle();
                }}
              >
                <Icon size={20} className="sidebar-link-icon" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Powered by faster-whisper
          </div>
        </div>
      </aside>
    </>
  );
}
