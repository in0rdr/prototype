class Summary
  include Mongoid::Document

  embeds_one :rating_summary
  embeds_one :rating_source

  accepts_nested_attributes_for :rating_summary, :rating_source
end