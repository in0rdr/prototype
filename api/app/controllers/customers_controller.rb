class CustomersController < ApplicationController
  before_action :set_customer

  # GET /customers/0x/tasks
  def tasks
    tasks_as_target = MitigationTask.where(target: @customer_addr)
    tasks_as_mitigator = MitigationTask.where(mitigator: @customer_addr)
    render json: tasks_as_target.concat(tasks_as_mitigator)
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_customer
      @customer_addr = params[:id]
    end

    # Only allow a trusted parameter "white list" through.
    def customer_params
      params.fetch(:customer, {})
    end
end
