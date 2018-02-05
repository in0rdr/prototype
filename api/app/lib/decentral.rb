require 'ethereum.rb'
require 'mongoid'
require_relative '../models/mitigation_task'

Mongoid.load!(File.expand_path('mongoid.yml', './config'), :development)

module Decentral
  REDIS = Redis.new
  BUILDPATH = File.expand_path('contracts/build')
  RPC_URL = ENV['ETHEREUM_RPC_URL']
  CLIENT = Ethereum::HttpClient.new(RPC_URL)
  IPFS_GATEWAY=ENV['IPFS_GATEWAY']

  IDENTITY_ADDR = ENV['IDENTITY_ADDR']
  MITGN_ADDR = ENV['MITGN_ADDR']
  REP_ADDR = ENV['REP_ADDR']
end

require_relative 'decentral/customer_utils'
require_relative 'decentral/mitigation_utils'
require_relative 'decentral/reputon_utils'