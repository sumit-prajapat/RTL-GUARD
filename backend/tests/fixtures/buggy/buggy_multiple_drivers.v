// Seeded bug: Multiple procedural drivers on the same register
module buggy_multiple_drivers (
    input  wire clk1,
    input  wire clk2,
    input  wire d1,
    input  wire d2,
    output reg  shared_reg
);

    // Driver 1
    always @(posedge clk1) begin
        shared_reg <= d1;
    end

    // Bug: Illegal Driver 2 driving the exact same register 'shared_reg'
    always @(posedge clk2) begin
        shared_reg <= d2;
    end

endmodule
