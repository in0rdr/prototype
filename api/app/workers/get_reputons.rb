require 'sidekiq-scheduler'
require_relative '../lib/decentral'

class GetLatestReputonList
  include Sidekiq::Worker

  def perform
    Decentral::Reputon.get_latest_tasks
  end
end
