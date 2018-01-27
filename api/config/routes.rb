Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  resources :mitigation_tasks do
    member do
      get 'fetch'
    end
  end

  get '/customers', to: 'customers#index'
  get '/customers/:id', to: 'customers#show'
  get '/customers/:id/reputons', to: 'customers#reputons'
  get '/customers/:id/reputation', to: 'customers#reputation'

  get '/targets', to: 'targets#index'
  get '/targets/:id', to: 'targets#show'
  get '/targets/:id/reputons', to: 'targets#reputons'
  get '/targets/:id/reputation', to: 'targets#reputation'
end
