import React, { useState, useRef, useEffect } from 'react';
import { FileCodeIcon, UploadIcon } from './Icons';

export default function VerilogEditor({
  code,
  setCode,
  fileName = 'active_module.v',
  flaggedLines = {},
  selectedLine = null,
  onLineSelect = null,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const lines = code.split('\n');
  const totalLines = lines.length;

  const updateCursorPosition = (e) => {
    const target = e.target;
    const textUpToCursor = target.value.substring(0, target.selectionStart);
    const lineNum = textUpToCursor.split('\n').length;
    const colNum = textUpToCursor.split('\n').pop().length + 1;
    setCursorPos({ line: lineNum, col: colNum });
  };

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

  // Scroll to selected line when clicked from diagnostics
  useEffect(() => {
    if (selectedLine && textareaRef.current) {
      const el = textareaRef.current;
      const linesArray = el.value.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(selectedLine - 1, linesArray.length); i++) {
        offset += linesArray[i].length + 1;
      }
      el.focus();
      el.setSelectionRange(offset, offset + (linesArray[selectedLine - 1]?.length || 0));
    }
  }, [selectedLine]);

  return (
    <div className="verilog-editor-frame">
      {/* Editor File Tab Header */}
      <div className="editor-tab-bar">
        <div className="active-file-tab">
          <FileCodeIcon size={14} className="tab-icon" />
          <span className="tab-filename">{fileName}</span>
          <span className="tab-badge">IEEE 1364</span>
        </div>
        <div className="editor-tab-actions">
          <input
            type="file"
            accept=".v,.sv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            className="editor-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import Verilog source (.v, .sv)"
          >
            <UploadIcon size={13} />
            <span>Open File</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="editor-canvas">
        {/* Gutter with Line Numbers & Diagnostic Markers */}
        <div className="editor-gutter">
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const marker = flaggedLines[lineNum];
            return (
              <div
                key={lineNum}
                className={`gutter-row ${selectedLine === lineNum ? 'selected-line' : ''}`}
                onClick={() => onLineSelect && onLineSelect(lineNum)}
              >
                <span className="gutter-marker-slot">
                  {marker && (
                    <span
                      className={`gutter-glyph ${marker.severity.toLowerCase()}`}
                      title={`Line ${lineNum}: ${marker.title}`}
                    />
                  )}
                </span>
                <span className="gutter-number">{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Textarea Code Input */}
        <div className="editor-input-wrapper">
          <textarea
            ref={textareaRef}
            id="verilog-code-editor"
            className="editor-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            placeholder="// Enter or paste single-module synthesizable Verilog RTL here..."
            spellCheck={false}
          />
        </div>
      </div>

      {/* Gutter/Editor Footer Status */}
      <div className="editor-status-bar">
        <div className="status-left">
          <span>Verilog HDL</span>
          <span className="status-sep">•</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="status-sep">•</span>
          <span>{totalLines} lines</span>
        </div>
        <div className="status-right">
          <span>UTF-8</span>
          <span className="status-sep">•</span>
          <span>Spaces: 4</span>
        </div>
      </div>
    </div>
  );
}
