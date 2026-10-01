import React from 'react';
import {
  FileText, MessageSquare, CheckCircle, Target,
  Clock, HelpCircle, Sparkles
} from 'lucide-react';

export default function SummaryView({ summary }) {
  if (!summary || typeof summary !== 'object') {
    return (
      <div className="empty-state" style={{ padding: 32 }}>
        <p style={{ color: 'var(--text-muted)' }}>No summary available.</p>
      </div>
    );
  }

  const method = summary.method || 'unknown';
  const methodLabel = method === 'gemini' ? 'AI (Gemini)'
    : method === 'openai' ? 'AI (OpenAI)'
    : method === 'extractive' ? 'Extractive (No API)'
    : 'Generated';

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 24, fontSize: 12, color: 'var(--text-muted)'
      }}>
        <Sparkles size={14} />
        Summary generated via: <span className="badge badge-info">{methodLabel}</span>
      </div>

      {/* Overview */}
      {summary.overview && (
        <div className="summary-section">
          <div className="summary-section-title">
            <FileText size={18} className="summary-section-icon" />
            Meeting Overview
          </div>
          <div className="summary-overview">{summary.overview}</div>
        </div>
      )}

      {/* Key Points */}
      {summary.key_points?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">
            <MessageSquare size={18} className="summary-section-icon" />
            Key Discussion Points
          </div>
          <ul className="summary-list">
            {summary.key_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Decisions */}
      {summary.decisions?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">
            <CheckCircle size={18} className="summary-section-icon" />
            Important Decisions
          </div>
          <ul className="summary-list">
            {summary.decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {summary.action_items?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">
            <Target size={18} className="summary-section-icon" />
            Action Items
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {summary.action_items.map((item, i) => (
              <div key={i} className="action-item">
                <div className="action-item-task">
                  {typeof item === 'string' ? item : item.task}
                </div>
                {typeof item === 'object' && (
                  <div className="action-item-meta">
                    <span>👤 {item.assignee || 'Unassigned'}</span>
                    <span>📅 {item.deadline || 'Not specified'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deadlines */}
      {summary.deadlines?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">
            <Clock size={18} className="summary-section-icon" />
            Deadlines Mentioned
          </div>
          <ul className="summary-list">
            {summary.deadlines.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up Questions */}
      {summary.follow_up_questions?.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">
            <HelpCircle size={18} className="summary-section-icon" />
            Follow-up Questions
          </div>
          <ul className="summary-list">
            {summary.follow_up_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
