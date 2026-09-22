// Clean reference module: 3-state Moore Finite State Machine
module fsm_moore (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       start,
    input  wire       done_op,
    output reg  [1:0] state_out,
    output reg        busy
);

    localparam [1:0] S_IDLE  = 2'b00;
    localparam [1:0] S_READ  = 2'b01;
    localparam [1:0] S_WRITE = 2'b10;

    reg [1:0] current_state;
    reg [1:0] next_state;

    // Sequential state register
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            current_state <= S_IDLE;
        end else begin
            current_state <= next_state;
        end
    end

    // Combinational next-state logic
    always @(*) begin
        next_state = current_state;
        case (current_state)
            S_IDLE: begin
                if (start) begin
                    next_state = S_READ;
                end
            end
            S_READ: begin
                if (done_op) begin
                    next_state = S_WRITE;
                end
            end
            S_WRITE: begin
                next_state = S_IDLE;
            end
            default: begin
                next_state = S_IDLE;
            end
        endcase
    end

    // Combinational output logic (Moore style: depends only on current_state)
    always @(*) begin
        state_out = current_state;
        case (current_state)
            S_IDLE:  busy = 1'b0;
            S_READ:  busy = 1'b1;
            S_WRITE: busy = 1'b1;
            default: busy = 1'b0;
        endcase
    end

endmodule
