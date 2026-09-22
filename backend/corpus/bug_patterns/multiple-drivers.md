# Pattern: multiple-drivers

## Name
Multiple Drivers on the Same Register or Wire

## Tags
multiple-drivers, short-circuit, contention, synthesis-error, always-block

## Explanation
In synthesizable Verilog, a single register (`reg`) or wire cannot be actively driven by more than one procedural block (`always`) or simultaneously driven by both an `assign` statement and an `always` block. When multiple drivers exist, the hardware target attempts to connect the outputs of two separate physical gates or flip-flops directly together, causing electrical contention.

## Bad Example
```verilog
always @(posedge clk1) begin
    status_reg <= data_in1;
end

// Illegal second driver on status_reg!
always @(posedge clk2) begin
    status_reg <= data_in2;
end
```

## Fixed Example
```verilog
always @(posedge clk1) begin
    if (select_source)
        status_reg <= data_in1;
    else
        status_reg <= data_in2;
end
```

## Why It Matters
Simulation will often model multiple drivers as unresolved `x` (unknown) contention or simply overwrite one assignment with another based on execution order. In physical hardware, multi-driver contention creates high-current short circuits between power and ground rails, leading to overheated silicon, voltage droop, and synthesis compilation failure.
