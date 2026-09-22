// Clean reference module: 8-bit Arithmetic Logic Unit (ALU)
module alu8bit (
    input  wire [7:0] a,
    input  wire [7:0] b,
    input  wire [2:0] opcode,
    output reg  [7:0] result,
    output reg        carry_out,
    output wire       zero_flag
);

    reg [8:0] sum_extended;

    always @(*) begin
        // Default assignments to prevent unintended latch inference
        result       = 8'd0;
        carry_out    = 1'b0;
        sum_extended = 9'd0;

        case (opcode)
            3'b000: begin // ADD
                sum_extended = {1'b0, a} + {1'b0, b};
                result       = sum_extended[7:0];
                carry_out    = sum_extended[8];
            end
            3'b001: begin // SUB
                sum_extended = {1'b0, a} - {1'b0, b};
                result       = sum_extended[7:0];
                carry_out    = sum_extended[8];
            end
            3'b010: begin // AND
                result       = a & b;
                carry_out    = 1'b0;
            end
            3'b011: begin // OR
                result       = a | b;
                carry_out    = 1'b0;
            end
            3'b100: begin // XOR
                result       = a ^ b;
                carry_out    = 1'b0;
            end
            3'b101: begin // NOT A
                result       = ~a;
                carry_out    = 1'b0;
            end
            3'b110: begin // Shift Left Logical by 1
                result       = a << 1;
                carry_out    = a[7];
            end
            3'b111: begin // Shift Right Logical by 1
                result       = a >> 1;
                carry_out    = a[0];
            end
            default: begin
                result       = 8'd0;
                carry_out    = 1'b0;
            end
        endcase
    end

    assign zero_flag = (result == 8'd0);

endmodule
