require 'sidekiq-scheduler'
require_relative '../lib/decentral'

class GetLatestTasks
  include Sidekiq::Worker

  def perform
    Decentral::Task.get_latest_tasks
  end
end
