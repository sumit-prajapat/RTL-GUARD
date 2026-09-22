// Seeded bug: Missing default case causing unintended latch inference
module buggy_latch_missing_default (
    input  wire [1:0] sel,
    input  wire [3:0] in0,
    input  wire [3:0] in1,
    output reg  [3:0] out
);

    // Bug: Case statement only covers 2'b00 and 2'b01 without default -> infers transparent latch
    always @(*) begin
        case (sel)
            2'b00: out = in0;
            2'b01: out = in1;
        endcase
    end

endmodule
