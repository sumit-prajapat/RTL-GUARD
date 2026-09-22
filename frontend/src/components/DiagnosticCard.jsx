import React, { useState } from 'react';
import { CopyIcon, CheckCircleIcon } from './Icons';

export default function DiagnosticCard({ finding, onLineSelect }) {
  const [copied, setCopied] = useState(false);
  const { title, pattern_ref, line, severity, explanation, suggested_fix } = finding;

  const severityNorm = (severity || 'medium').toLowerCase();
  const severityLabel = severityNorm === 'high' ? 'ERROR' : severityNorm === 'low' ? 'INFO' : 'WARNING';

  const handleCopy = () => {
    if (!suggested_fix) return;
    navigator.clipboard.writeText(suggested_fix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`diagnostic-card severity-${severityNorm}`}>
      {/* Diagnostic Header */}
      <div className="diag-header">
        <div className="diag-badges">
          <span className={`diag-pill diag-pill-${severityNorm}`}>
            <span className="diag-pill-dot" />
            {severityLabel}
          </span>
          {line && (
            <button
              className="diag-loc-pill"
              onClick={() => onLineSelect && onLineSelect(line)}
              title="Jump to code location"
            >
              Line {line}
            </button>
          )}
          <span className="diag-rule-id">[{pattern_ref}]</span>
        </div>
      </div>

      {/* Title & Technical Explanation */}
      <h4 className="diag-title">{title}</h4>
      <p className="diag-explanation">{explanation}</p>

      {/* Suggested Fix Diff */}
      {suggested_fix && (
        <div className="diag-patch-box">
          <div className="patch-header">
            <span className="patch-label">RECOMMENDED FIX</span>
            <button
              className="copy-patch-btn"
              onClick={handleCopy}
              title="Copy code replacement to clipboard"
            >
              {copied ? (
                <>
                  <CheckCircleIcon size={12} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon size={12} />
                  <span>Copy Fix</span>
                </>
              )}
            </button>
          </div>
          <pre className="patch-code">
            <code>{suggested_fix}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
