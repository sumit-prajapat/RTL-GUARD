// Seeded bug: Width mismatch with silent truncation
module buggy_width_mismatch (
    input  wire       clk,
    input  wire [7:0] data_in,
    output reg  [3:0] truncated_out
);

    // Bug: Assigning 8-bit signal to 4-bit register causes silent loss of upper bits [7:4]
    always @(posedge clk) begin
        truncated_out <= data_in;
    end

endmodule
