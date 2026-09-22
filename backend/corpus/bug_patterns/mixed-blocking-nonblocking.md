# Pattern: mixed-blocking-nonblocking

## Name
Mixing Blocking and Non-Blocking Assignments in the Same Always Block

## Tags
mixed-assignments, sequential, race-condition, simulation-synthesis-mismatch, coding-standard

## Explanation
Within a single procedural block (`always`), mixing blocking (`=`) and non-blocking (`<=`) assignments creates unpredictable simulation event ordering and makes hardware synthesis synthesis ambiguous. The IEEE Verilog standard specifies that blocking assignments take effect immediately, while non-blocking assignments are deferred to the NBA queue. Mixing them within the same block confuses sequential pipelining, complicates verification, and frequently causes simulation-to-synthesis divergence.

## Bad Example
```verilog
always @(posedge clk) begin
    temp = data_in + 8'd1;     // Blocking assignment
    data_out <= temp * 2;      // Non-blocking assignment in same block
    flag = 1'b1;               // Mixed assignment style
end
```

## Fixed Example
```verilog
always @(posedge clk) begin
    // Use strictly non-blocking assignments for sequential logic
    temp_reg <= data_in + 8'd1;
    data_out <= (data_in + 8'd1) * 2;
    flag     <= 1'b1;
end
```

## Why It Matters
Synthesis tools and functional simulators may interpret execution order differently when blocking and non-blocking assignments are combined on related signals in the same block. This is a severe coding standard violation that creates hard-to-diagnose simulation mismatches and potential timing hazards in synthesized netlists.
