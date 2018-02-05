module Decentral
  class Reputon
    CONTRACT_ABI = JSON.parse(File.read(File.join(BUILDPATH, "Reputation.json")))['interface']
    @contract = Ethereum::Contract.create(
      name: 'Reputation',
      address: REP_ADDR,
      abi: CONTRACT_ABI,
      client: Decentral::CLIENT,
    )

    def self.ipfs_url(ipfs_key)
      "http://#{IPFS_GATEWAY}/ipfs/#{ipfs_key}"
    end

    def self.get_mitigator_reputons(addr)
      mitigator_tasks = MitigationTask.where(mitigator: addr)
      # reputons[:task_id][0] is claim of attack target about mitigator
      mitigator_tasks.map do |t|
        { ipfs_key: @contract.call.get_reputon(t._id, 0),
          task_id: t._id }
      end
    end

    def self.get_target_reputons(addr)
      target_tasks = MitigationTask.where(target: addr)
      # reputons[:task_id][1] is claim of mitigator about the target
      target_tasks.map do |t|
        { ipfs_key: @contract.call.get_reputon(t._id, 1),
          task_id: t._id }
      end
    end

    def self.reputation_summary(reputons)
      summary = Summary.new ({
        rating_summary_attributes: {
          positive: 0,
          neutral: 0,
          negative: 0
        }, rating_source_attributes: {
          positive: [],
          neutral: [],
          negative: []
        }
      })

      reputons.each do |r|
        if valid_reputon(r[:ipfs_key])
          Rails.logger.debug "Valid reputon in: #{r}"
          
          # summarize valid feedbacks
          reputon = parse_reputon(r[:ipfs_key])
          if reputon["rating"] == 1
            summary.rating_summary.positive += 1
            summary.rating_source.positive << r[:task_id]
          elsif reputon["rating"] == 0
            summary.rating_summary.negative += 1
            summary.rating_source.negative << r[:task_id]
          else
            summary.rating_summary.neutral += 1
            summary.rating_source.neutral << r[:task_id]
            Rails.logger.debug "Neutral rating"
          end
        else
          Rails.logger.debug "Invalid reputon media type for hash: #{r}"
          summary.rating_summary.neutral += 1
          summary.rating_source.neutral << r[:task_id]
        end
      end

      summary
    end

    private
      def self.parse_reputon(ipfs_hash)
        response = HTTParty.get(ipfs_url(ipfs_hash))
        JSON.parse(response.body)["reputons"][0]
      end

      # validate reputon media type
      def self.valid_reputon(ipfs_hash)
        return false if ipfs_hash.empty?

        response = HTTParty.get(ipfs_url(ipfs_hash))
        return false if response.code != 200

        begin
          reputon = JSON.parse(response.body)
        rescue JSON::ParserError
          return false
        end

        return false if reputon.keys.sort != %w[application reputons]
        true
      end
  end
end