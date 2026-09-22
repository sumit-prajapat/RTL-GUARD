import React from 'react';

export default function IssueCard({ finding, onLineClick }) {
  const { title, pattern_ref, line, severity, explanation, suggested_fix } = finding;

  const severityUpper = (severity || 'medium').toUpperCase();

  const getSeverityClass = () => {
    switch (severityUpper) {
      case 'HIGH':
        return 'badge-high';
      case 'LOW':
        return 'badge-low';
      default:
        return 'badge-med';
    }
  };

  return (
    <div className={`issue-card ${getSeverityClass()}`}>
      <div className="issue-card-header">
        <div className="issue-card-meta">
          <span className={`severity-badge ${getSeverityClass()}`}>
            <span className="severity-dot"></span>
            {severityUpper}
          </span>
          {line && (
            <button
              className="line-tag-btn"
              onClick={() => onLineClick && onLineClick(line)}
              title="Click to jump to line"
            >
              Line {line}
            </button>
          )}
        </div>
        <div className="pattern-ref" title="Cited knowledge base pattern">
          {pattern_ref}
        </div>
      </div>

      <h4 className="issue-title">{title}</h4>

      <p className="issue-explanation">{explanation}</p>

      {suggested_fix && (
        <div className="fix-container">
          <div className="fix-header">
            <span>Suggested RTL Fix</span>
          </div>
          <pre className="fix-code">
            <code>{suggested_fix}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
