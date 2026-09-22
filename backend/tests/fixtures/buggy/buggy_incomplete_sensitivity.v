// Seeded bug: Incomplete sensitivity list (omits 'sel' signal)
module buggy_incomplete_sensitivity (
    input  wire [3:0] in0,
    input  wire [3:0] in1,
    input  wire       sel,
    output reg  [3:0] out
);

    // Bug: 'sel' is read inside but omitted from the sensitivity list
    always @(in0 or in1) begin
        if (sel)
            out = in1;
        else
            out = in0;
    end

endmodule
