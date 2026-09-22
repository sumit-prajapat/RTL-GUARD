# Pattern: nonblocking-in-combinational

## Name
Non-blocking Assignment Used in Combinational Always Block

## Tags
combinational, nonblocking-assignment, delta-cycles, simulation-performance, latch

## Explanation
In combinational `always @(*)` blocks, logic should evaluate immediately as a pure flow-through network. Using non-blocking assignments (`<=`) schedules updates into the NBA (Non-Blocking Assignment) event region of the simulation cycle. If intermediate variables within the block are assigned with `<=`, subsequent statements in the same block read the old (pre-assignment) value instead of the freshly computed intermediate value, creating multi-delta simulation cycles or unintended storage.

## Bad Example
```verilog
always @(*) begin
    temp <= a + b;
    out  <= temp << 1; // 'out' evaluates using the OLD value of 'temp' from the previous evaluation cycle!
end
```

## Fixed Example
```verilog
always @(*) begin
    temp = a + b;
    out  = temp << 1; // 'out' immediately reflects the updated value of 'temp'
end
```

## Why It Matters
Using non-blocking assignments for combinational logic slows down simulation, produces confusing race conditions between interdependent combinational signals, and risks synthesis tools inferring sequential elements or generating logic loops that violate pure feedforward combinational paths.
