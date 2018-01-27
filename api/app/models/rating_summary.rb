class RatingSummary
  include Mongoid::Document

  field :positive, type: Integer
  field :neutral, type: Integer
  field :negative, type: Integer

  embedded_in :summary_result
end