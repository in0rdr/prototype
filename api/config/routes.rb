Rails.application.routes.draw do
  apipie
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html

  get '/infos', to: 'infos#index'

  get '/mitigation_tasks', to: 'mitigation_tasks#index'
  get '/mitigation_tasks/:id', to: 'mitigation_tasks#show'
  get '/mitigation_tasks/:id/fetch', to: 'mitigation_tasks#fetch'

  get '/customers', to: 'customers#index'
  get '/customers/:id', to: 'customers#show'
  get '/customers/:id/reputons', to: 'customers#reputons'
  get '/customers/:id/reputation', to: 'customers#reputation'
  get '/customers/:id/fetch', to: 'customers#fetch'

  get '/targets', to: 'targets#index'
  get '/targets/:id', to: 'targets#show'
  get '/targets/:id/reputons', to: 'targets#reputons'
  get '/targets/:id/reputation', to: 'targets#reputation'
  get '/targets/:id/fetch', to: 'targets#fetch'

  get '/mitigators', to: 'mitigators#index'
  get '/mitigators/:id', to: 'mitigators#show'
  get '/mitigators/:id/reputons', to: 'mitigators#reputons'
  get '/mitigators/:id/reputation', to: 'mitigators#reputation'
  get '/mitigators/:id/fetch', to: 'mitigators#fetch'
end
