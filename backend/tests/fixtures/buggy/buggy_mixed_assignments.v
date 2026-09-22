// Seeded bug: Mixed blocking and non-blocking assignments in the same clocked block
module buggy_mixed_assignments (
    input  wire       clk,
    input  wire       rst_n,
    input  wire [7:0] in_data,
    output reg  [7:0] out_data,
    output reg        valid
);

    reg [7:0] temp;

    // Bug: Mixing '=' and '<=' in the same sequential block
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            out_data <= 8'd0;
            valid <= 1'b0;
            temp = 8'd0;
        end else begin
            temp = in_data + 8'd1;     // Blocking assignment
            out_data <= temp << 1;     // Non-blocking assignment
            valid = 1'b1;              // Blocking assignment
        end
    end

endmodule
