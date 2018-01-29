Apipie.configure do |config|
  config.app_name                = "Reputation API"
  config.app_info["1.0"]         = "Reputation API for Cooperative DDoS Defense"
  config.copyright               = "&copy; 2018 Andreas Gruhler"
  config.api_base_url            = "/"
  config.doc_base_url            = "/apipie"
  config.validate                = false
  config.reload_controllers      = false
  config.translate               = false
  #config.markup                  = Apipie::Markup::Markdown.new
  # where is your API defined?
  config.api_controllers_matcher = "#{Rails.root}/app/controllers/**/*.rb"
end
