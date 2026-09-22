// Seeded bug: Blocking assignment used in clocked sequential logic
module buggy_blocking_in_seq (
    input  wire clk,
    input  wire rst_n,
    input  wire d,
    output reg  q1,
    output reg  q2
);

    // Bug: Blocking assignments '=' in clocked sequential block cause pipeline collapse
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            q1 = 1'b0;
            q2 = 1'b0;
        end else begin
            q1 = d;
            q2 = q1;
        end
    end

endmodule
