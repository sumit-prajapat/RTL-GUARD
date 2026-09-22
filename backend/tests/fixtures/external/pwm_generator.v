// External module fixture: Pulse-Width Modulation (PWM) Controller
// Sourced from standard embedded hardware timer peripheral designs
module pwm_generator (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       enable,
    input  wire [7:0] period,
    input  wire [7:0] duty_cycle,
    output reg        pwm_out
);

    reg [7:0] counter;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            counter <= 8'd0;
            pwm_out <= 1'b0;
        end else if (enable) begin
            if (counter >= period) begin
                counter <= 8'd0;
            end else begin
                counter <= counter + 8'd1;
            end

            // Generate PWM output based on counter vs duty_cycle comparator
            if (counter < duty_cycle) begin
                pwm_out <= 1'b1;
            end else begin
                pwm_out <= 1'b0;
            end
        end else begin
            pwm_out <= 1'b0;
        end
    end

endmodule
