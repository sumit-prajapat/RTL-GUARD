import React from 'react';
import IssueCard from './IssueCard';

export default function ResultsPanel({ results, loading, error, onLineClick }) {
  if (loading) {
    return (
      <div className="panel results-panel empty-state">
        <div className="state-content">
          <div className="loading-orbit">
            <div className="orbit-core"></div>
            <div className="orbit-ring"></div>
          </div>
          <h3>Running RTL Review Pipeline</h3>
          <p>Running static token checks → FAISS RAG vector similarity search → Grounded LLM reasoning...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel results-panel">
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-text">
            <strong>Analysis Interrupted:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="panel results-panel empty-state">
        <div className="state-content">
          <div className="empty-icon">🛡️</div>
          <h3>Awaiting Verilog Source</h3>
          <p>Select a sample preset or paste your code on the left, then click <strong>Run Code Review</strong>.</p>
          <div className="features-pill-row">
            <span className="feature-pill">Deterministic Pre-Checks</span>
            <span className="feature-pill">FAISS Vector RAG</span>
            <span className="feature-pill">Grounded Fixes</span>
          </div>
        </div>
      </div>
    );
  }

  const { precheck = [], ai_findings = [], synthesis = {}, degraded = false, error_message = null } = results;
  const totalIssues = precheck.length + ai_findings.length + (synthesis.warnings?.length || 0);

  return (
    <div className="panel results-panel">
      <div className="panel-header">
        <div className="panel-title-area">
          <span className="panel-icon">📊</span>
          <h3>Review Findings</h3>
        </div>
        <div className="header-status">
          {totalIssues === 0 ? (
            <span className="clean-badge">✓ Golden Clean (0 issues)</span>
          ) : (
            <span className="issues-badge">{totalIssues} Total Issues Detected</span>
          )}
        </div>
      </div>

      <div className="results-scroll-area">
        {degraded && (
          <div className="degraded-banner">
            <span className="warn-icon">ℹ️</span>
            <span>
              <strong>Fallback Mode Active:</strong> {error_message || "Live LLM response unparsable; showing deterministic pattern results."}
            </span>
          </div>
        )}

        {/* SECTION 1: DETERMINISTIC PRE-CHECKS */}
        <div className="result-section precheck-section">
          <div className="section-header">
            <h4>1. Static Pre-Checks (Non-AI)</h4>
            <span className="section-count">{precheck.length}</span>
          </div>
          {precheck.length === 0 ? (
            <div className="section-clean">✓ Passed all syntax, balance, and termination checks.</div>
          ) : (
            <div className="issues-list">
              {precheck.map((item, idx) => (
                <div key={idx} className="precheck-item">
                  <div className="precheck-badge">SYNTAX</div>
                  {item.line && (
                    <button
                      className="line-tag-btn"
                      onClick={() => onLineClick && onLineClick(item.line)}
                    >
                      Line {item.line}
                    </button>
                  )}
                  <span className="precheck-message">{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: AI / RAG GROUNDED FINDINGS */}
        <div className="result-section ai-section">
          <div className="section-header">
            <h4>2. AI & RAG Bug Detections</h4>
            <span className="section-count">{ai_findings.length}</span>
          </div>
          {ai_findings.length === 0 ? (
            <div className="section-clean">✓ No hardware anti-patterns or race conditions flagged.</div>
          ) : (
            <div className="issues-list">
              {ai_findings.map((finding, idx) => (
                <IssueCard key={idx} finding={finding} onLineClick={onLineClick} />
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: YOSYS SYNTHESIS (STRETCH) */}
        <div className="result-section synthesis-section">
          <div className="section-header">
            <h4>3. Hardware Synthesis Validation (Yosys)</h4>
            <span className={`status-pill ${synthesis.enabled ? 'active' : 'disabled'}`}>
              {synthesis.enabled ? 'Validated' : 'Disabled'}
            </span>
          </div>
          {!synthesis.enabled ? (
            <div className="section-note">
              Synthesis check is disabled. Enable the checkbox in the editor to run gate-level synthesis if Yosys is installed.
            </div>
          ) : (
            <div className="synthesis-results">
              {synthesis.warnings && synthesis.warnings.length > 0 ? (
                <div className="synthesis-warnings">
                  <strong>Synthesis Warnings ({synthesis.warnings.length}):</strong>
                  <ul>
                    {synthesis.warnings.map((w, idx) => (
                      <li key={idx}><code>{w}</code></li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="section-clean">✓ Clean synthesis compilation; no latch or netlist warnings.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
