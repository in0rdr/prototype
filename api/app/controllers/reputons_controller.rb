class ReputonsController < ApplicationController
  before_action :set_reputon, only: [:show, :update, :destroy]

  # GET /reputons
  def index
    @reputons = Reputon.all

    render json: @reputons
  end

  # GET /reputons/1
  def show
    render json: @reputon
  end

  # POST /reputons
  def create
    @reputon = Reputon.new(reputon_params)

    if @reputon.save
      render json: @reputon, status: :created, location: @reputon
    else
      render json: @reputon.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /reputons/1
  def update
    if @reputon.update(reputon_params)
      render json: @reputon
    else
      render json: @reputon.errors, status: :unprocessable_entity
    end
  end

  # DELETE /reputons/1
  def destroy
    @reputon.destroy
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_reputon
      @reputon = Reputon.find(params[:id])
    end

    # Only allow a trusted parameter "white list" through.
    def reputon_params
      params.fetch(:reputon, {})
    end
end
