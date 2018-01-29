require 'ethereum.rb'
require 'mongoid'
require_relative '../models/mitigation_task'

Mongoid.load!(File.expand_path('mongoid.yml', './config'), :development)
REDIS = Redis.new
BUILDPATH = File.expand_path('contracts/build')

module Decentral
  class Task
    MITIGATION_CONTRACT_ADDRESS = ENV['MITGN_ADDR']
    MITIGATION_CONTRACT_ABI = JSON.parse(File.read(File.join(BUILDPATH, "Mitigation.json")))['interface']

    def self.reset_task_count
      REDIS.set('known_task_count', -1)
    end

    def self.get_latest_tasks
      client = Ethereum::HttpClient.new(ENV['ETHEREUM_RPC_URL'])
      contract = Ethereum::Contract.create(
        name: 'Mitigation',
        address: MITIGATION_CONTRACT_ADDRESS,
        abi: MITIGATION_CONTRACT_ABI,
        client: client,
      )

      task_count = contract.call.task_count
      known_task_count = Integer(REDIS.get('known_task_count') || -1)
      puts "Max known tasks in Ethereum: #{task_count - 1}"
      puts "Max known tasks in local db: #{known_task_count}"

      (known_task_count + 1...task_count).each do |task_index|
        get_task(task_index, contract)
      end
    end

    def self.get_task(task_index, contract)
      puts "\n"
      puts "Task ##{task_index}"
      task = contract.call.tasks(task_index)
      puts task
      puts "SETTING known_task_count: #{task_index}"
      REDIS.set('known_task_count', task_index)

      MitigationTask.create(mitgn: MITIGATION_CONTRACT_ADDRESS, _id: task_index, target: task[0], mitigator: task[1])
    end
  end
end
