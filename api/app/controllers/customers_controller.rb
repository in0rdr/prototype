class CustomersController < ApplicationController
  before_action :set_customer, only: [:show, :reputons, :reputation]

  # GET /customers
  api! "Show all targets and mitigators"
  def index
    targets = MitigationTask.distinct(:target)
    mitigators = MitigationTask.distinct(:mitigator)

    customers = targets + mitigators
    # & returns the common elements
    render json: customers - (targets & mitigators)
  end

  # GET /customers/0x
  api :GET, "/customers/:customer_addr", "Show customer"
  param :customer_addr, String, desc: "Customer account address (hex)"
  def show
    target_tasks = MitigationTask.where(target: @customer_addr)
    mitigator_tasks = MitigationTask.where(mitigator: @customer_addr)
    render json: target_tasks.concat(mitigator_tasks)
  end

  # GET /customers/0x/reputons
  api :GET, "/customers/:customer_addr/reputons", "Show reputation claims about customer"
  param :customer_addr, String, desc: "Customer account address (hex)"
  def reputons
    reputons_earned_as_target = get_target_reputons(@customer_addr)
    reputons_earned_as_mitigator = get_mitigator_reputons(@customer_addr)
    render json: reputons_earned_as_target.concat(reputons_earned_as_mitigator)
  end

  # GET /customers/0x/reputation
  api :GET, "/customers/:customer_addr/reputation", "Show customer reputation"
  param :customer_addr, String, desc: "Customer account address (hex)"
  def reputation
    reputons_earned_as_target = get_target_reputons(@customer_addr)
    reputons_earned_as_mitigator = get_mitigator_reputons(@customer_addr)
    all_reputons = reputons_earned_as_target.concat(reputons_earned_as_mitigator)
    render json: reputation_summary(all_reputons)
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
