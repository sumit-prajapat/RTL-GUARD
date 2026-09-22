import React, { useState, useEffect } from 'react';
import CodeInputPanel from './components/CodeInputPanel';
import ResultsPanel from './components/ResultsPanel';
import './App.css';

const SAMPLES = {
  clean: `// Clean 8-bit synchronous up-counter
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

  latch: `// Combinational case statement inferring transparent latch
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

  blocking: `// Pipeline register with race condition
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

  syntax: `// Verilog module with unbalanced begin/end and missing semicolon
module faulty_syntax (
    input  wire clk,
    input  wire d
    output reg  q // Notice missing semicolon above
);

    always @(posedge clk) begin
        q <= d;
    // Missing matching 'end' keyword
endmodule`
};

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [code, setCode] = useState(SAMPLES.latch);
  const [useYosys, setUseYosys] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") {
          setBackendOnline(true);
        }
      })
      .catch(() => setBackendOnline(false));
  }, []);

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
        throw new Error(errorData.detail || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Failed to reach review service.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = (key) => {
    if (SAMPLES[key]) {
      setCode(SAMPLES[key]);
      setResults(null);
      setError(null);
    }
  };

  const handleLineClick = (lineNum) => {
    const editor = document.getElementById("verilog-code-editor");
    if (!editor) return;
    const lines = editor.value.split("\n");
    let pos = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      pos += lines[i].length + 1;
    }
    editor.focus();
    editor.setSelectionRange(pos, pos + (lines[lineNum - 1]?.length || 0));
  };

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand-group">
          <div className="brand-logo">🛡️</div>
          <div>
            <h1 className="brand-title">RTL-guard</h1>
            <p className="brand-subtitle">AI Verilog Code Reviewer & Bug Detector</p>
          </div>
        </div>

        <div className="navbar-status-group">
          <div className={`status-pill ${backendOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {backendOnline ? 'FastAPI Backend Online' : 'Backend Disconnected (Port 8000)'}
          </div>
          <div className="status-pill static-rag">
            <span className="rag-icon">🧠</span>
            FAISS RAG: Active
          </div>
        </div>
      </header>

      {/* Main Two-Pane Container */}
      <main className="main-content">
        <CodeInputPanel
          code={code}
          setCode={setCode}
          onAnalyze={handleAnalyze}
          loading={loading}
          useYosys={useYosys}
          setUseYosys={setUseYosys}
          onLoadSample={handleLoadSample}
        />
        <ResultsPanel
          results={results}
          loading={loading}
          error={error}
          onLineClick={handleLineClick}
        />
      </main>

      {/* Footer */}
      <footer className="footer-bar">
        <span>RTL-guard v1.0 • Verilog (IEEE 1364-2005) Analysis Engine</span>
        <span>Grounded RAG • Sentence-Transformers & FAISS</span>
      </footer>
    </div>
  );
}
