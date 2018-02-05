class TargetsController < ApplicationController
  before_action :set_target, only: [:fetch, :show, :reputons, :reputation]

  # GET /targets
  api! "Show all attack targets"
  def index
    targets = MitigationTask.distinct(:target)
    render json: targets
  end

  # GET /targets/0x
  api :GET, "targets/:target_addr", "Show tasks of attack target"
  param :target_addr, String, desc: "Target account address (hex)"
  def show
    tasks = MitigationTask.where(target: @target_addr)
    render json: tasks
  end

  # GET /targets/0x/fetch
  api :GET, "targets/:target_addr/fetch", "Fetch target from blockchain"
  param :target_addr, String, desc: "Target account address (hex)"
  def fetch
    customer = Decentral::Identity::get_customer(@target_addr)
    render json: customer
  end

  # GET /targets/0x/reputons
  api :GET, "targets/:target_addr/reputons", "Show reputation claims about attack target"
  param :target_addr, String, desc: "Target account address (hex)"
  def reputons
    render json: Decentral::Reputon::get_target_reputons(@target_addr)
  end

  # GET /targets/0x/reputation
  api :GET, "targets/:target_addr/reputation", "Show reputation for attack target"
  param :target_addr, String, desc: "Target account address (hex)"
  def reputation
    reputons = Decentral::Reputon::get_target_reputons(@target_addr)
    summary = Decentral::Reputon::reputation_summary(reputons)
    render json: summary
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_target
      @target_addr = params[:id]
    end

    # Only allow a trusted parameter "white list" through.
    def target_params
      params.fetch(:target, {})
    end
end
