// Seeded bug: Sequential clocked logic missing reset handling
module buggy_missing_reset (
    input  wire       clk,
    input  wire       enable,
    input  wire [7:0] data_in,
    output reg  [7:0] state_reg
);

    // Bug: Clocked block lacks reset handling, powering up in unknown 'x' state
    always @(posedge clk) begin
        if (enable) begin
            state_reg <= data_in;
        end
    end

endmodule
