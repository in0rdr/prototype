class MitigatorsController < ApplicationController
  before_action :set_mitigator, only: [:fetch, :show, :reputons, :reputation]

  # GET /mitigators
  api! "Show all mitigators"
  def index
    mitigators = MitigationTask.distinct(:mitigator)
    render json: mitigators
  end

  # GET /mitigators/0x
  api :GET, "mitigators/:mitigator_addr", "Show tasks of mitigator"
  param :mitigator_addr, String, desc: "Mitigator account address (hex)"
  def show
    tasks = MitigationTask.where(mitigator: @mitigator_addr)
    render json: tasks
  end

  # GET /mitigators/0x/fetch
  api :GET, "mitigators/:mitigator_addr/fetch", "Fetch mitigator from blockchain"
  param :mitigator_addr, String, desc: "Mitigator account address (hex)"
  def fetch
    customer = Decentral::Identity::get_customer(@mitigator_addr)
    render json: customer
  end

  # GET /mitigators/0x/reputons
  api :GET, "mitigators/:mitigator_addr/reputons", "Show reputation claims about mitigator"
  param :mitigator_addr, String, desc: "Mitigator account address (hex)"
  def reputons
    render json: Decentral::Reputon::get_mitigator_reputons(@mitigator_addr)
  end

  # GET /mitigators/0x/reputation
  api :GET, "mitigators/:mitigator_addr/reputation", "Show reputation for mitigator"
  param :mitigator_addr, String, desc: "Mitigator account address (hex)"
  def reputation
    reputons = Decentral::Reputon::get_mitigator_reputons(@mitigator_addr)
    summary = Decentral::Reputon::reputation_summary(reputons)
    render json: summary
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_mitigator
      @mitigator_addr = params[:id]
    end

    # Only allow a trusted parameter "white list" through.
    def mitigator_params
      params.fetch(:mitigator, {})
    end
end
