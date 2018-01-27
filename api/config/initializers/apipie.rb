Apipie.configure do |config|
  config.app_name                = "Api"
  config.api_base_url            = "/api"
  config.doc_base_url            = "/apipie"
  config.reload_controllers      = false
  config.translate               = false
  # where is your API defined?
  config.api_controllers_matcher = "#{Rails.root}/app/controllers/**/*.rb"
end
