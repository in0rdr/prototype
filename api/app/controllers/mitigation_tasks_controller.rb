require 'ethereum.rb'

BILDPATH = File.expand_path('contracts/build')
CONTRACT_ABI = JSON.parse(File.read(File.join(BILDPATH, "Mitigation.json")))['interface']
ADDRESS = ENV['MITGN_ADDR']
CLIENT = Ethereum::HttpClient.new(ENV['ETHEREUM_RPC_URL'])

class MitigationTasksController < ApplicationController
  before_action :set_mitigation_task, only: [:fetch, :show, :update, :destroy]

  # GET /mitigation_tasks
  api! "Show all mitigation contracts"
  def index
    @mitigation_tasks = MitigationTask.all

    render json: @mitigation_tasks
  end

  # GET /mitigation_tasks/1
  api! "Show mitigation contract"
  def show
    render json: @mitigation_task
  end

  # GET /mitigation_tasks/1/fetch
  api! "Fetch mitigation contract from blockchain"
  def fetch
    contract = Ethereum::Contract.create(
      name: 'Mitigation',
      address: ADDRESS,
      abi: CONTRACT_ABI,
      client: CLIENT,
    )
    task = contract.call.tasks(@mitigation_task._id)

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
