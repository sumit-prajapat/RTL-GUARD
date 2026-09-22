// Clean reference module: D Flip-Flop with synchronous reset and enable
module dff_sync (
    input  wire clk,
    input  wire rst,
    input  wire en,
    input  wire d,
    output reg  q
);

    always @(posedge clk) begin
        if (rst) begin
            q <= 1'b0;
        end else if (en) begin
            q <= d;
        end
    end

endmodule
