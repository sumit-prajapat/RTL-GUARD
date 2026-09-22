# Pattern: blocking-in-sequential

## Name
Blocking Assignment Used in Sequential Always Block

## Tags
sequential, blocking-assignment, race-condition, flip-flop, clock

## Explanation
In sequential `always @(posedge clk)` blocks, using blocking assignments (`=`) instead of non-blocking assignments (`<=`) forces immediate evaluation and update within the active simulation event queue. When multiple clocked blocks interact or when registers are cascaded (e.g., shift registers or pipeline stages), blocking assignments create simulator-dependent race conditions where the order of block execution changes the resulting values.

## Bad Example
```verilog
always @(posedge clk) begin
    q1 = d;
    q2 = q1; // q2 receives the NEW value of d in the same clock edge, collapsing the pipeline stage
end
```

## Fixed Example
```verilog
always @(posedge clk) begin
    q1 <= d;
    q2 <= q1; // q2 receives the OLD value of q1, correctly implementing a two-stage flip-flop chain
end
```

## Why It Matters
Synthesis tools synthesize sequential flip-flops that update simultaneously at clock edges. Using blocking assignments in sequential blocks causes simulation race conditions that differ completely between simulators and hardware silicon, leading to broken pipelines and corrupted data paths.
