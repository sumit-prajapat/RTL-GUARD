# Pattern: width-mismatch

## Name
Bit-Width Mismatch in Assignment or Port Mapping

## Tags
width-mismatch, truncation, zero-extension, arithmetic-overflow, port-connection

## Explanation
Verilog automatically performs implicit truncation or zero-extension when the bit-width of an expression's left-hand side (LHS) does not match the right-hand side (RHS). If an 8-bit signal is assigned to a 4-bit register, the most significant bits [7:4] are silently discarded without throwing a syntax error. Conversely, if an undersized literal (such as `1'b0` or untyped decimal `0`) is concatenated or compared against a wide vector, unexpected zero padding can occur.

## Bad Example
```verilog
reg [3:0] counter_val;
wire [7:0] bus_data;

always @(posedge clk) begin
    // Silent truncation: upper 4 bits [7:4] of bus_data are lost!
    counter_val <= bus_data;
end
```

## Fixed Example
```verilog
reg [3:0] counter_val;
wire [7:0] bus_data;

always @(posedge clk) begin
    // Explicitly choose or down-sample the intended bits
    counter_val <= bus_data[3:0];
end
```

## Why It Matters
Silent bit-width truncation discards upper numerical significance or control flags, frequently causing undetected data corruption, counter rollover errors, and subtle arithmetic overflows that pass compilation without compiler warnings.
