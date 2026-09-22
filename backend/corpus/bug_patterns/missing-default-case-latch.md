# Pattern: missing-default-case-latch

## Name
Missing Default Case or Incomplete If-Else Causing Unintended Latch Inference

## Tags
combinational, latch-inference, case-statement, if-else, hardware-hazard

## Explanation
In combinational logic (`always @(*)`), every output register must be assigned a deterministic value across all possible input branch conditions. When a `case` statement does not cover every input permutation and lacks a `default:` clause, or when an `if` statement lacks an `else` branch, the synthesizer assumes that the variable must retain its previous value under the unhandled conditions. To achieve memory retention without a clock, the synthesis tool infers a level-sensitive latch.

## Bad Example
```verilog
always @(*) begin
    case (opcode)
        2'b00: alu_out = a + b;
        2'b01: alu_out = a - b;
        // Missing 2'b10, 2'b11 and missing default!
    endcase
end
```

## Fixed Example
```verilog
always @(*) begin
    case (opcode)
        2'b00: alu_out = a + b;
        2'b01: alu_out = a - b;
        default: alu_out = 8'd0; // All unhandled conditions explicitly defined
    endcase
end
```

## Why It Matters
Transparent latches are notoriously difficult for Static Timing Analysis (STA) tools to constrain, are highly sensitive to glitches on control inputs, and consume unexpected routing resources. In synchronous FPGA and ASIC designs, unintentional latches are considered critical defects that can cause timing violations, race hazards, and silicon functional failure.
