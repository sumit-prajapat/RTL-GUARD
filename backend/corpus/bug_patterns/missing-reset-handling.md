# Pattern: missing-reset-handling

## Name
Missing Reset Handling in Sequential Always Block

## Tags
sequential, reset, initialization, x-state, flip-flop, asic-bringup

## Explanation
Sequential state elements (flip-flops, state registers, counters) require a well-defined reset condition (either synchronous or asynchronous) to initialize into a known physical state upon power-on or system reset. Without an explicit reset branch in the clocked block, flip-flop states power up to undefined/unknown (`x`) states in gate-level simulation and unpredictable random states in physical ASIC/FPGA hardware.

## Bad Example
```verilog
always @(posedge clk) begin
    // No reset condition check: register starts in unknown 'x' state upon reset
    state <= next_state;
    counter <= counter + 1'b1;
end
```

## Fixed Example
```verilog
always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        state   <= S_IDLE;
        counter <= 8'd0;
    end else begin
        state   <= next_state;
        counter <= counter + 1'b1;
    end
end
```

## Why It Matters
Without a deterministic reset state, state machines and pipeline control registers cannot be placed into a known starting state during power-up or system recovery. In simulation, this causes `x`-propagation that poisons downstream logic, and in physical silicon, it leads to un-initializable hardware and failed chip bring-up.
