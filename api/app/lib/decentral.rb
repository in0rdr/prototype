module Decentral
  def self.handle_error(error, params = {})
    raise(error) if Rails.env.test?

    Rails.logger.error('in Decentral handle_error'.bold)
    Rails.logger.error(error.message.to_s.red)
    # Airbrake.notify error, params
    Raven.capture_exception(error, params.reverse_merge(level: 'info'))
  end

  class DecentralError < StandardError
  end

  # DecentralError:

  class NotFoundError < DecentralError
  end

  class InvalidFormatError < DecentralError
  end

  class ReputonError < DecentralError
  end

  # ReputonError:

  class ReputonFormatError < ReputonError
  end

  class ReputonSignatureError < ReputonError
  end
end

require_relative 'decentral/reputon'