require_relative '../lib/decentral'

class MitigationTasksController < ApplicationController
  before_action :set_mitigation_task, only: [:fetch, :show]

  # GET /mitigation_tasks
  api! "Show all mitigation contracts"
  def index
    @mitigation_tasks = MitigationTask.all

    render json: @mitigation_tasks
  end

  # GET /mitigation_tasks/1
  api! "Show mitigation contract"
  param :id, Integer, desc: "Mitigation contract id"
  def show
    render json: @mitigation_task
  end

  # GET /mitigation_tasks/1/fetch
  api! "Fetch mitigation contract from blockchain"
  param :id, Integer, desc: "Mitigation contract id"
  def fetch
    task = Decentral::Task::fetch_task(@mitigation_task._id)
    render json: task
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_mitigation_task
      @mitigation_task = MitigationTask.find(params[:id])
    end

    # Only allow a trusted parameter "white list" through.
    def mitigation_task_params
      params.fetch(:mitigation_task, {})
    end
end
