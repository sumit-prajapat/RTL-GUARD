# Pattern: incomplete-sensitivity-list

## Name
Incomplete Sensitivity List in Combinational Always Block

## Tags
combinational, sensitivity-list, simulation-synthesis-mismatch, always-block

## Explanation
In legacy Verilog-1995/2001 style, a combinational `always @(...)` block requires all input signals read inside the block to be explicitly enumerated in the sensitivity list. If a signal is omitted, the block will not re-evaluate when that signal transitions during simulation, causing stale outputs and simulation-synthesis mismatch. Modern Verilog avoids this entirely by using `always @(*)`.

## Bad Example
```verilog
always @(a or b) begin
    // 'sel' is read here but omitted from the sensitivity list
    if (sel)
        out = a;
    else
        out = b;
end
```

## Fixed Example
```verilog
always @(*) begin
    // using @(*) automatically makes the block sensitive to all read signals
    if (sel)
        out = a;
    else
        out = b;
end
```

## Why It Matters
Synthesis tools assume combinational logic behaves continuously and synthesize pure gate networks regardless of the sensitivity list. In simulation, however, changes to `sel` will not update `out` until `a` or `b` toggles, causing silicon-vs-simulation discrepancies that conceal critical bugs during testing.
