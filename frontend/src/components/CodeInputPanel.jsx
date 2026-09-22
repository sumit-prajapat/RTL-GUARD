import React, { useRef } from 'react';

export default function CodeInputPanel({
  code,
  setCode,
  onAnalyze,
  loading,
  useYosys,
  setUseYosys,
  onLoadSample,
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCode(content);
      }
    };
    reader.readAsText(file);
  };

  const lineCount = code ? code.split('\n').length : 1;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="panel code-input-panel">
      <div className="panel-header">
        <div className="panel-title-area">
          <span className="panel-icon">⚡</span>
          <h3>RTL Source Editor</h3>
        </div>
        <div className="sample-presets">
          <span className="preset-label">Presets:</span>
          <button className="preset-btn" onClick={() => onLoadSample('clean')}>Clean Module</button>
          <button className="preset-btn" onClick={() => onLoadSample('latch')}>Latch Bug</button>
          <button className="preset-btn" onClick={() => onLoadSample('blocking')}>Blocking in Seq</button>
          <button className="preset-btn" onClick={() => onLoadSample('syntax')}>Syntax Error</button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-lines" aria-hidden="true">
          {lineNumbers.map((num) => (
            <div key={num} className="line-num">{num}</div>
          ))}
        </div>
        <textarea
          id="verilog-code-editor"
          className="code-textarea code-font"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Paste your single-module synthesizable Verilog code here, or upload a .v file..."
          spellCheck={false}
        />
      </div>

      <div className="panel-footer">
        <div className="footer-left">
          <input
            type="file"
            accept=".v,.sv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            className="secondary-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload .v Verilog file"
          >
            📁 Upload .v
          </button>
          <label className="checkbox-label" title="Enable secondary Yosys synthesis validation">
            <input
              type="checkbox"
              checked={useYosys}
              onChange={(e) => setUseYosys(e.target.checked)}
            />
            <span>Yosys Synthesis (Stretch)</span>
          </label>
          <span className="code-metrics">{lineCount} lines • {code.length} chars</span>
        </div>

        <button
          id="run-analysis-btn"
          className={`primary-cta ${loading ? 'loading' : ''}`}
          onClick={onAnalyze}
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Analyzing RTL...
            </>
          ) : (
            <>Run Code Review →</>
          )}
        </button>
      </div>
    </div>
  );
}
