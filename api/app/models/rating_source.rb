class RatingSource
  include Mongoid::Document

  field :positive, type: Array
  field :neutral, type: Array
  field :negative, type: Array

  embedded_in :summary_result
end
