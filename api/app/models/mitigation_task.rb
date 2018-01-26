class MitigationTask
  include Mongoid::Document
  field :mitgn, type: String
  field :_id, type: Integer
  field :target, type: String
  field :mitigator, type: String
end
