// External module fixture: AMBA APB Slave Peripheral Interface
// Implements standard address-decoded read/write registers
module apb_slave (
    input  wire        pclk,
    input  wire        presetn,
    input  wire        psel,
    input  wire        penable,
    input  wire        pwrite,
    input  wire [31:0] paddr,
    input  wire [31:0] pwdata,
    output reg  [31:0] prdata,
    output wire        pready,
    output wire        pslverr
);

    reg [31:0] reg_control;
    reg [31:0] reg_status;

    assign pready  = 1'b1; // Zero wait-state responses
    assign pslverr = 1'b0; // No transfer errors

    // APB Write Transfer
    always @(posedge pclk or negedge presetn) begin
        if (!presetn) begin
            reg_control <= 32'h00000000;
        end else if (psel && penable && pwrite) begin
            case (paddr[3:2])
                2'b00: reg_control <= pwdata;
                default: ; // Ignore writes to read-only or invalid addresses
            endcase
        end
    end

    // APB Read Transfer (Combinational output gating)
    always @(*) begin
        if (psel && !pwrite) begin
            case (paddr[3:2])
                2'b00:   prdata = reg_control;
                2'b01:   prdata = reg_status;
                default: prdata = 32'h00000000;
            endcase
        end else begin
            prdata = 32'h00000000;
        end
    end

endmodule
