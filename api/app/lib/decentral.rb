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

  class Reputon
    REPUTATION_CONTRACT_ADDRESS = ENV['REP_ADDR']
    REPUTATION_CONTRACT_ABI = JSON.parse(File.read(File.join(BUILDPATH, "Reputation.json")))['interface']

    def self.get_latest_reputons
      client = Ethereum::HttpClient.new(ENV['ETHEREUM_RPC_URL'])

      contract = Ethereum::Contract.create(
        name: 'Reputation',
        address: REPUTATION_CONTRACT_ADDRESS,
        abi: REPUTATION_CONTRACT_ABI,
        client: client,
      )

      task_count = contract.call.task_count
      known_task_count = Integer(REDIS.get('known_task_count') || -1)
      puts "Max known reputon in Ethereum: #{task_count - 1}"
      puts "Max known reputon in local db: #{known_task_count}"

      (known_task_count + 1...task_count).each do |reputon_index|
        get_reputon(reputon_index, contract)
      end
    end

    def self.get_reputon(reputon_index, contract)
      puts "\n"
      puts "Reputon ##{reputon_index}"
      ipfs_key = contract.call.get_reputon(reputon_index)

      response = HTTParty.get(ipfs_url(ipfs_key))
      # puts response.body, response.code #, response.message, response.headers.inspect
      log response.code
      if response.code != 200
        raise Decentral::NotFoundError, "Error fetching #{ipfs_url(ipfs_key)} -- #{response.body} -- #{response.code}"
      end

      content = response.body
      parse(content, ipfs_key)
    rescue DecentralError => e
      Decentral.handle_error e
    ensure
      log_counts "SETTING known_task_count: #{reputon_index}"
      REDIS.set('known_task_count', reputon_index)
    end

    def self.ipfs_url(ipfs_key)
      "https://ipfs.io/ipfs/#{ipfs_key}"
    end

    def self.parse(content, ipfs_key)
      begin
        data = JSON.parse(content)
      rescue JSON::ParserError
        raise Decentral::InvalidFormatError, "Expected JSON from #{ipfs_url(ipfs_key)}, but got: [[ #{content[0...1000]} ]]"
      end

      if data.keys.sort == %w[application reputons]
        save_reputon(data, ipfs_key)
      elsif data['type'] == 'project'
        save_project(data)
      elsif data['type'] == 'permanode'
        log_info 'permanode:', data
      else
        raise Decentral::InvalidFormatError, "Could not determine claim type; content: [[ #{content[0...1000]} ]]"
      end
    end

    def self.save_reputon(reputons_envelope, signer, ipfs_key)
      log reputons_envelope
      application = reputons_envelope['application']
      if application != 'skills'
        raise ReputonFormatError, "Expected application 'skills' but was: #{reputons_envelope['application']}.\nReputons:\n#{JSON.pretty_unparse(reputons_envelope)}"
      end

      reputons_data = reputons_envelope['reputons']
      reputons_data.each do |reputon_data|
        begin
          if address(reputon_data['rater']) != address(signer)
            raise ReputonSignatureError, "Reputon rater: #{reputon_data['rater'].inspect} should match transaction signer: #{signer.inspect}.\nFull reputon:\n#{JSON.pretty_unparse(reputon_data)}"
          end

          if reputon_data['rater'] == reputon_data['rated']
            save_skill! reputon_data, ipfs_key
          else
            save_confirmation! reputon_data, ipfs_key
          end
        rescue DecentralError => error
          Decentral.handle_error error
        end
      end
    end

  end
end
