import React, { useState, useEffect, useMemo } from 'react';
import VerilogEditor from './components/VerilogEditor';
import InspectorTabs from './components/InspectorTabs';
import { ChipIcon, PlayIcon, DownloadIcon, RefreshCwIcon, DatabaseIcon } from './components/Icons';
import './App.css';

const SAMPLES = {
  latch: {
    name: 'alu_latch_inference.v',
    code: `// Combinational case statement inferring transparent latch
module alu_selector (
    input  wire [1:0] sel,
    input  wire [3:0] in0,
    input  wire [3:0] in1,
    output reg  [3:0] out
);

    // Bug: Case branches 2'b10 and 2'b11 are unhandled and no default is provided
    always @(*) begin
        case (sel)
            2'b00: out = in0;
            2'b01: out = in1;
        endcase
    end

endmodule`,
  },
  clean: {
    name: 'counter_8bit.v',
    code: `// Clean 8-bit synchronous up-counter with active-low asynchronous reset
module counter (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       enable,
    output reg  [7:0] count
);

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            count <= 8'd0;
        end else if (enable) begin
            count <= count + 8'd1;
        end
    end

endmodule`,
  },
  blocking: {
    name: 'pipeline_stage.v',
    code: `// Pipeline register with race condition
module pipeline_stage (
    input  wire clk,
    input  wire rst_n,
    input  wire d,
    output reg  q1,
    output reg  q2
);

    // Bug: Blocking '=' in clocked block collapses the 2-stage pipeline
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            q1 = 1'b0;
            q2 = 1'b0;
        end else begin
            q1 = d;
            q2 = q1;
        end
    end

endmodule`,
  },
  comb_nonblocking: {
    name: 'comb_adder.v',
    code: `// Non-blocking in combinational logic
module comb_adder (
    input  wire [7:0] a,
    input  wire [7:0] b,
    output reg  [7:0] out
);

    reg [7:0] sum;

    // Bug: Non-blocking '<=' in combinational logic reads stale sum
    always @(*) begin
        sum <= a + b;
        out <= sum << 1;
    end

endmodule`,
  },
  syntax: {
    name: 'syntax_error.v',
    code: `// Module with syntax defects
module faulty_syntax (
    input  wire clk,
    input  wire d
    output reg  q // Missing semicolon above
);

    always @(posedge clk) begin
        q <= d;
    // Missing 'end' keyword
endmodule`,
  },
};

const API_BASE = "http://127.0.0.1:8001";

export default function App() {
  const [selectedSampleKey, setSelectedSampleKey] = useState('latch');
  const [code, setCode] = useState(SAMPLES.latch.code);
  const [fileName, setFileName] = useState(SAMPLES.latch.name);
  const [useYosys, setUseYosys] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ online: false, yosys: false });
  const [corpusPatterns, setCorpusPatterns] = useState([]);

  // Fetch backend status and loaded corpus
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        setBackendStatus({ online: data.status === "ok", yosys: data.yosys_enabled || false });
      })
      .catch(() => setBackendStatus({ online: false, yosys: false }));

    fetch(`${API_BASE}/api/corpus`)
      .then((res) => res.json())
      .then((data) => {
        if (data.patterns) setCorpusPatterns(data.patterns);
      })
      .catch(() => {});
  }, []);

  // Compute flagged lines mapping for editor gutter
  const flaggedLines = useMemo(() => {
    const map = {};
    if (!results) return map;
    (results.precheck || []).forEach((item) => {
      if (item.line) {
        map[item.line] = { severity: 'high', title: item.message };
      }
    });
    (results.ai_findings || []).forEach((finding) => {
      if (finding.line) {
        map[finding.line] = { severity: finding.severity || 'medium', title: finding.title };
      }
    });
    return map;
  }, [results]);

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          options: { use_yosys: useYosys }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Failed to reach review service.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (e) => {
    const key = e.target.value;
    setSelectedSampleKey(key);
    if (SAMPLES[key]) {
      setCode(SAMPLES[key].code);
      setFileName(SAMPLES[key].name);
      setResults(null);
      setError(null);
      setSelectedLine(null);
    }
  };

  const handleExportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rtl_guard_report_${fileName.replace('.v', '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to run review
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, useYosys]);

  return (
    <div className="eda-workbench">
      {/* Top Application Bar */}
      <header className="eda-top-bar">
        <div className="top-left-group">
          <div className="app-badge">
            <ChipIcon className="app-chip-icon" size={18} />
            <span className="app-name">RTL-GUARD</span>
            <span className="app-tag">EDA LINT & REVIEW</span>
          </div>
          <div className="top-divider" />
          <div className="top-breadcrumb">
            <span className="crumb-repo">sumit-prajapat/RTL-GUARD</span>
            <span className="crumb-slash">/</span>
            <span className="crumb-file">{fileName}</span>
          </div>
        </div>

        <div className="top-right-group">
          <div className="engine-status-pill">
            <DatabaseIcon size={13} className="engine-icon" />
            <span>FAISS FlatIP: {corpusPatterns.length || 8} Patterns</span>
          </div>
          <div className={`engine-status-pill ${backendStatus.online ? 'status-ok' : 'status-err'}`}>
            <span className="status-indicator-dot" />
            <span>{backendStatus.online ? 'Backend Live (Port 8001)' : 'Backend Offline'}</span>
          </div>
        </div>
      </header>

      {/* Engineering Action Toolbar */}
      <div className="eda-toolbar">
        <div className="toolbar-left">
          <button
            className={`action-btn-primary ${loading ? 'loading' : ''}`}
            onClick={handleAnalyze}
            disabled={loading || !code.trim()}
            title="Execute review pipeline (Ctrl + Enter)"
          >
            <PlayIcon size={12} />
            <span>{loading ? 'Analyzing RTL...' : 'Run Review'}</span>
            <span className="kbd-shortcut">Ctrl+↵</span>
          </button>

          <div className="toolbar-divider" />

          {/* Sample Presets Select */}
          <div className="sample-select-wrapper">
            <span className="sample-label">Fixture:</span>
            <select
              className="sample-select"
              value={selectedSampleKey}
              onChange={handleSelectSample}
            >
              <option value="latch">Latch Inference Bug (Missing Default)</option>
              <option value="blocking">Blocking in Sequential Logic</option>
              <option value="comb_nonblocking">Non-blocking in Combinational</option>
              <option value="syntax">Syntax Errors (Unbalanced / Semicolon)</option>
              <option value="clean">Golden Clean Counter (0 Defects)</option>
            </select>
          </div>

          <label className="yosys-toggle" title="Feature-flagged Yosys synthesis check">
            <input
              type="checkbox"
              checked={useYosys}
              onChange={(e) => setUseYosys(e.target.checked)}
            />
            <span>Yosys Gate-Level Synth</span>
          </label>
        </div>

        <div className="toolbar-right">
          {results && (
            <button
              className="action-btn-secondary"
              onClick={handleExportJSON}
              title="Download structured JSON report"
            >
              <DownloadIcon size={12} />
              <span>Export JSON</span>
            </button>
          )}
          <button
            className="action-btn-secondary"
            onClick={() => { setResults(null); setError(null); setSelectedLine(null); }}
            title="Reset review workspace"
          >
            <RefreshCwIcon size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main Two-Pane Split Workbench */}
      <main className="eda-workspace-grid">
        <section className="workbench-pane pane-editor">
          <VerilogEditor
            code={code}
            setCode={setCode}
            fileName={fileName}
            flaggedLines={flaggedLines}
            selectedLine={selectedLine}
            onLineSelect={setSelectedLine}
          />
        </section>

        <section className="workbench-pane pane-inspector">
          <InspectorTabs
            results={results}
            loading={loading}
            error={error}
            onLineSelect={setSelectedLine}
            corpusPatterns={corpusPatterns}
          />
        </section>
      </main>

      {/* EDA Workbench Bottom Status Bar */}
      <footer className="eda-bottom-bar">
        <div className="bar-left">
          <span className="bar-item">RTL-guard v1.0.0</span>
          <span className="bar-sep">|</span>
          <span className="bar-item">Zero False-Positive Gate: Active</span>
          <span className="bar-sep">|</span>
          <span className="bar-item">IEEE 1364-2005 Synthesizable</span>
        </div>
        <div className="bar-right">
          <span className="bar-item">Sentence-Transformers: all-MiniLM-L6-v2</span>
          <span className="bar-sep">|</span>
          <span className="bar-item">Groq LLM: LLaMA-3.3-70B</span>
        </div>
      </footer>
    </div>
  );
}
