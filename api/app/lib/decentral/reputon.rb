require 'ethereum.rb'
require 'rails'

module Decentral
  class Reputon
    REPUTATION_CONTRACT_ADDRESS = ENV['REP_ADDR']
    MITIGATION_CONTRACT_ADDRESS = ENV['MITGN_ADDR']
    REPUTATION_CONTRACT_ABI = ENV['REP_ABI']
    MITIGATION_CONTRACT_ABI = ENV['MITGN_ABI']
    #REPUTATION_CONTRACT_ABI = JSON.parse %( [{\"constant\":true,\"inputs\":[],\"name\":\"reputonCount\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"attackTargetRated\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_id\",\"type\":\"uint256\"},{\"name\":\"_peer\",\"type\":\"uint256\"}],\"name\":\"getReputon\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_mitigation\",\"type\":\"address\"},{\"name\":\"_id\",\"type\":\"uint256\"},{\"name\":\"_reputon\",\"type\":\"string\"}],\"name\":\"rate\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"mitigatorRated\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}] )
    REDIS = Redis.new

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
    end

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

    # def self.save_project(params)
    #   # TODO
    #   # - fetch permanode
    #   # - compare permanode creator to permanode signer, raise if not same
    #   # - compare permanode creator to project profile signer, raise if not same
    #   # - store creator on Project#permanode_creator_uport_address
    #   # - compare permanode creator to signer, raise if not same

    #   skill_list = params['skills']
    #   params.deep_transform_keys!(&:underscore)
    #   project = Project.new params.without('type', 'timestamp', 'skills')
    #   project.skill_list = skill_list
    #   project.save!
    # rescue => e
    #   raise InvalidFormatError, "Project saving failed from params: #{params.inspect} ( original params: #{orig_params.inspect} )
    #     \nFrom: #{e.inspect}"
    #   # {
    #   #     address: "",
    #   #     contact: "",
    #   #     imageUrl: "",
    #   #     permanodeId: "/ipfs/QmY6GV3ME9DYEtYYHTwnBB33VFXsLGF2K4JuJBam8eLXyf",
    #   #     skills: "",
    #   #     title: "",
    #   #     type: "project"
    #   # }
    # end

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

    # def self.save_skill!(reputon_data, ipfs_key)
    #   user = User.find_or_create_by(uport_address: reputon_data['rater'])
    #   skill_claim = user.skill_claims.find_by(ipfs_reputon_key: ipfs_key)
    #   return if skill_claim.present?
    #   project = Project.find_or_create_by!(permanode_id: reputon_data['project']) # TODO: validate valid permanode
    #   begin
    #     log user.skill_claims.create!(
    #       name: reputon_data['assertion'],
    #       ipfs_reputon_key: ipfs_key,
    #       project_permanode_id: project.permanode_id,
    #     )
    #   rescue ActiveRecord::RecordInvalid => e
    #     Decentral.handle_error e
    #   end
    # end

    # def self.save_confirmation!(reputon_data, ipfs_key)
    #   # TODO: reject conf if normal rating not 0.5

    #   confirmer = User.find_or_create_by(uport_address: reputon_data['rater'])
    #   skill_claim = SkillClaim.find_by(ipfs_reputon_key: reputon_data['rated'])
    #   if skill_claim.blank?
    #     raise ReputonFormatError, "No skill_claim found for [#{reputon_data['rated']}].\nFull reputon:\n#{JSON.pretty_unparse(reputon_data)}"
    #   end
    #   if address(confirmer.uport_address) == address(skill_claim.user.uport_address)
    #     raise ReputonFormatError, "Attempting to self confirm, rejected.\nFull reputon:\n#{JSON.pretty_unparse(reputon_data)}"
    #   end
    #   confirmation = Confirmation.find_by(ipfs_reputon_key: ipfs_key)
    #   return if confirmation.present?
    #   log confirmer.confirmations.create!(
    #     confirmer: confirmer,
    #     skill_claim: skill_claim,
    #     claimant: skill_claim.user,
    #     rating: reputon_data['rating'],
    #     ipfs_reputon_key: ipfs_key,
    #   )
    # end

    # def self.address(candidate)
    #   candidate&.sub(/^0x/, '')
    # end
  end
end
