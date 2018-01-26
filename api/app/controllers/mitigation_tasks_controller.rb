class MitigationTasksController < ApplicationController
  before_action :set_mitigation_task, only: [:show, :update, :destroy]

  # GET /mitigation_tasks
  def index
    @mitigation_tasks = MitigationTask.all

    render json: @mitigation_tasks
  end

  # GET /mitigation_tasks/1
  def show
    render json: @mitigation_task
  end

  # POST /mitigation_tasks
  def create
    @mitigation_task = MitigationTask.new(mitigation_task_params)

    if @mitigation_task.save
      render json: @mitigation_task, status: :created, location: @mitigation_task
    else
      render json: @mitigation_task.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /mitigation_tasks/1
  def update
    if @mitigation_task.update(mitigation_task_params)
      render json: @mitigation_task
    else
      render json: @mitigation_task.errors, status: :unprocessable_entity
    end
  end

  # DELETE /mitigation_tasks/1
  def destroy
    @mitigation_task.destroy
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
