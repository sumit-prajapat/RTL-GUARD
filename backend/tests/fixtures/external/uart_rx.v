// External module fixture: Standard UART Receiver (8-N-1 format)
// Sourced from typical open-source FPGA UART controller implementations
module uart_rx #(
    parameter CLKS_PER_BIT = 87 // Example for 10MHz clock and 115200 baud
) (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       rx_serial,
    output reg        rx_done,
    output reg  [7:0] rx_byte
);

    localparam [2:0] S_IDLE         = 3'b000;
    localparam [2:0] S_START_BIT    = 3'b001;
    localparam [2:0] S_DATA_BITS    = 3'b010;
    localparam [2:0] S_STOP_BIT     = 3'b011;
    localparam [2:0] S_CLEANUP      = 3'b100;

    reg [2:0] state;
    reg [15:0] clk_count;
    reg [2:0]  bit_index;
    reg        rx_data_r;
    reg        rx_data;

    // Double register the serial input to prevent metastability
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            rx_data_r <= 1'b1;
            rx_data   <= 1'b1;
        end else begin
            rx_data_r <= rx_serial;
            rx_data   <= rx_data_r;
        end
    end

    // UART RX State Machine
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state     <= S_IDLE;
            rx_done   <= 1'b0;
            clk_count <= 16'd0;
            bit_index <= 3'd0;
            rx_byte   <= 8'd0;
        end else begin
            case (state)
                S_IDLE: begin
                    rx_done   <= 1'b0;
                    clk_count <= 16'd0;
                    bit_index <= 3'd0;

                    if (rx_data == 1'b0) begin // Start bit detected
                        state <= S_START_BIT;
                    end
                end

                S_START_BIT: begin
                    if (clk_count == (CLKS_PER_BIT - 1) / 2) begin
                        if (rx_data == 1'b0) begin
                            clk_count <= 16'd0;
                            state     <= S_DATA_BITS;
                        end else begin
                            state <= S_IDLE;
                        end
                    end else begin
                        clk_count <= clk_count + 16'd1;
                    end
                end

                S_DATA_BITS: begin
                    if (clk_count < CLKS_PER_BIT - 1) begin
                        clk_count <= clk_count + 16'd1;
                    end else begin
                        clk_count          <= 16'd0;
                        rx_byte[bit_index] <= rx_data;

                        if (bit_index < 3'd7) begin
                            bit_index <= bit_index + 3'd1;
                        end else begin
                            bit_index <= 3'd0;
                            state     <= S_STOP_BIT;
                        end
                    end
                end

                S_STOP_BIT: begin
                    if (clk_count < CLKS_PER_BIT - 1) begin
                        clk_count <= clk_count + 16'd1;
                    end else begin
                        rx_done   <= 1'b1;
                        clk_count <= 16'd0;
                        state     <= S_CLEANUP;
                    end
                end

                S_CLEANUP: begin
                    rx_done <= 1'b0;
                    state   <= S_IDLE;
                end

                default: begin
                    state <= S_IDLE;
                end
            endcase
        end
    end

endmodule
