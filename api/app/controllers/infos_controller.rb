class InfosController < ApplicationController
  # GET /infos
  api! "Show server infos"
  def index
    infos = {
      reputation_contract: ENV['REP_ADDR'],
      mitigation_contract: ENV['MITGN_ADDR'],
      eth_rpc_url: ENV['ETHEREUM_RPC_URL'],
      ipfs_gateway: ENV['IPFS_GATEWAY']
    }
    render json: infos
  end
end
