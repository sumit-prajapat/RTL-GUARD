// Seeded bug: Non-blocking assignment in combinational logic with intermediate variable
module buggy_nonblocking_in_comb (
    input  wire [7:0] a,
    input  wire [7:0] b,
    output reg  [7:0] out
);

    reg [7:0] sum;

    // Bug: Non-blocking assignments '<=' in combinational logic cause stale intermediate reads
    always @(*) begin
        sum <= a + b;
        out <= sum << 1;
    end

endmodule
