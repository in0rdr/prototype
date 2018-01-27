class Summary
  has_one :rating_summary
  has_one :rating_source
  accepts_nested_attributes_for :rating_summary, :rating_source
end