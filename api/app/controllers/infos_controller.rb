class InfosController < ApplicationController
  # GET /infos
  api! "Show server infos"
  def index
    infos = {
      identity_contract: Decentral::IDENTITY_ADDR,
      mitigation_contract: Decentral::MITGN_ADDR,
      reputation_contract: Decentral::REP_ADDR,
      eth_rpc_url: Decentral::RPC_URL,
      ipfs_gateway: Decentral::IPFS_GATEWAY
    }
    render json: infos
  end
end
