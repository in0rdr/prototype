class Reputon
  include Mongoid::Document
  field :application, type: String
  field :reputons, type: Array
end