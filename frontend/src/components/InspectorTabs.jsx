import React, { useState } from 'react';
import DiagnosticCard from './DiagnosticCard';
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, TerminalIcon, DatabaseIcon } from './Icons';

export default function InspectorTabs({
  results,
  loading,
  error,
  onLineSelect,
  corpusPatterns = [],
}) {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const [filterSeverity, setFilterSeverity] = useState('all');

  if (loading) {
    return (
      <div className="inspector-frame loading-frame">
        <div className="loading-container">
          <div className="pulse-loader">
            <div className="pulse-ring" />
            <div className="pulse-core" />
          </div>
          <h4>Running Static Checks & Vector RAG</h4>
          <p className="loading-sub">Embedding source snippet → Querying FAISS → Grounded LLM reasoning...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inspector-frame error-frame">
        <div className="error-card">
          <AlertCircleIcon size={20} className="error-icon" />
          <div className="error-details">
            <h4>Pipeline Interrupted</h4>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="inspector-frame empty-frame">
        <div className="empty-container">
          <div className="empty-icon-shield">
            <CheckCircleIcon size={32} />
          </div>
          <h4>RTL Diagnostic Workbench Ready</h4>
          <p>Load an RTL module or preset, then click <strong>Run Review</strong> to initiate multi-stage static and semantic analysis.</p>
          <div className="workbench-pipeline-steps">
            <div className="pipe-step">
              <span className="step-idx">1</span>
              <span className="step-txt">Static Syntax Check</span>
            </div>
            <div className="pipe-step">
              <span className="step-idx">2</span>
              <span className="step-txt">FAISS Multi-View Retrieval</span>
            </div>
            <div className="pipe-step">
              <span className="step-idx">3</span>
              <span className="step-txt">Grounded RTL Rule Review</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { precheck = [], ai_findings = [], synthesis = {}, degraded = false, error_message = null } = results;

  const totalErrors = ai_findings.filter(f => (f.severity || '').toLowerCase() === 'high').length;
  const totalWarnings = ai_findings.filter(f => (f.severity || '').toLowerCase() === 'medium').length;
  const totalInfo = ai_findings.filter(f => (f.severity || '').toLowerCase() === 'low').length;
  const totalPrechecks = precheck.length;
  const grandTotal = totalErrors + totalWarnings + totalInfo + totalPrechecks;

  const filteredFindings = ai_findings.filter(f => {
    if (filterSeverity === 'all') return true;
    return (f.severity || '').toLowerCase() === filterSeverity;
  });

  return (
    <div className="inspector-frame">
      {/* Inspector Tab Bar */}
      <div className="inspector-tabs-header">
        <div className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            <AlertTriangleIcon size={14} />
            <span>Diagnostics</span>
            <span className={`tab-count-badge ${grandTotal > 0 ? 'has-issues' : 'clean'}`}>
              {grandTotal}
            </span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            <DatabaseIcon size={14} />
            <span>RAG Knowledge Base</span>
            <span className="tab-count-badge">{corpusPatterns.length || 8}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            <TerminalIcon size={14} />
            <span>Raw Response</span>
          </button>
        </div>

        {/* Global Summary Status */}
        <div className="inspector-global-badge">
          {grandTotal === 0 ? (
            <span className="badge-clean">
              <CheckCircleIcon size={12} />
              <span>0 Defects Detected</span>
            </span>
          ) : (
            <span className="badge-defects">
              <AlertCircleIcon size={12} />
              <span>{grandTotal} Findings</span>
            </span>
          )}
        </div>
      </div>

      {/* Tab 1: Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="inspector-body">
          {degraded && (
            <div className="fallback-banner">
              <AlertTriangleIcon size={14} />
              <span>Fallback evaluation mode: {error_message || 'Local deterministic pattern matching active.'}</span>
            </div>
          )}

          {/* Diagnostic Filter Toolbar */}
          <div className="diag-toolbar">
            <span className="filter-label">Filter:</span>
            <button
              className={`filter-chip ${filterSeverity === 'all' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('all')}
            >
              All ({ai_findings.length})
            </button>
            <button
              className={`filter-chip chip-error ${filterSeverity === 'high' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('high')}
            >
              Errors ({totalErrors})
            </button>
            <button
              className={`filter-chip chip-warning ${filterSeverity === 'medium' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('medium')}
            >
              Warnings ({totalWarnings})
            </button>
            <button
              className={`filter-chip chip-info ${filterSeverity === 'low' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('low')}
            >
              Info ({totalInfo})
            </button>
          </div>

          {/* Precheck Syntax Section */}
          {precheck.length > 0 && (
            <div className="diagnostics-subgroup">
              <div className="subgroup-title">
                <span>Static Syntax Pre-Checks</span>
                <span className="subgroup-count">{precheck.length}</span>
              </div>
              <div className="precheck-list">
                {precheck.map((item, idx) => (
                  <div key={idx} className="precheck-row">
                    <span className="precheck-tag">SYNTAX</span>
                    {item.line && (
                      <button
                        className="diag-loc-pill"
                        onClick={() => onLineSelect && onLineSelect(item.line)}
                      >
                        Line {item.line}
                      </button>
                    )}
                    <span className="precheck-text">{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI / RAG Findings */}
          <div className="diagnostics-subgroup">
            <div className="subgroup-title">
              <span>Hardware RTL Findings (RAG Grounded)</span>
              <span className="subgroup-count">{filteredFindings.length}</span>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="clean-verdict-box">
                <CheckCircleIcon size={18} className="clean-icon" />
                <div className="clean-text">
                  <strong>Zero RTL Defects Found in Filter</strong>
                  <p>Code conforms to clean synthesizable logic patterns without race conditions or latch inference.</p>
                </div>
              </div>
            ) : (
              <div className="cards-scroll-container">
                {filteredFindings.map((finding, idx) => (
                  <DiagnosticCard
                    key={idx}
                    finding={finding}
                    onLineSelect={onLineSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: RAG Corpus Patterns */}
      {activeTab === 'rag' && (
        <div className="inspector-body rag-body">
          <div className="rag-header-desc">
            <p>The RAG retrieval engine queries an embedded FAISS FlatIP index over 8 hardware bug-pattern documents. Every finding must cite one of these verified references:</p>
          </div>
          <div className="corpus-cards-list">
            {(corpusPatterns.length > 0 ? corpusPatterns : [
              { pattern_id: 'missing-default-case-latch', name: 'Missing Default Case Causing Latch Inference', tags: ['combinational', 'latch', 'case'] },
              { pattern_id: 'blocking-in-sequential', name: 'Blocking Assignment in Sequential Block', tags: ['sequential', 'blocking', 'race'] },
              { pattern_id: 'nonblocking-in-combinational', name: 'Non-blocking Assignment in Combinational Logic', tags: ['combinational', 'delta-cycles'] },
              { pattern_id: 'incomplete-sensitivity-list', name: 'Incomplete Sensitivity List in Always Block', tags: ['combinational', 'sensitivity-list'] },
              { pattern_id: 'multiple-drivers', name: 'Multiple Drivers on the Same Register', tags: ['contention', 'short-circuit'] },
              { pattern_id: 'width-mismatch', name: 'Bit-Width Mismatch in Assignment', tags: ['truncation', 'overflow'] },
              { pattern_id: 'mixed-blocking-nonblocking', name: 'Mixing Blocking and Non-Blocking Assignments', tags: ['coding-standard', 'race'] },
              { pattern_id: 'missing-reset-handling', name: 'Missing Reset in Sequential Clocked Logic', tags: ['sequential', 'reset', 'x-state'] },
            ]).map((pattern, idx) => (
              <div key={idx} className="corpus-item-card">
                <div className="corpus-item-header">
                  <span className="corpus-id-pill">[{pattern.pattern_id}]</span>
                  <span className="corpus-tags">{(pattern.tags || []).join(', ')}</span>
                </div>
                <h5 className="corpus-name">{pattern.name}</h5>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Raw JSON */}
      {activeTab === 'raw' && (
        <div className="inspector-body raw-body">
          <pre className="raw-json-view">
            <code>{JSON.stringify(results, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
