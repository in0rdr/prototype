Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  resources :mitigation_tasks do
    member do
      get 'fetch'
    end
  end

  get '/customers/:id/tasks', to: 'customers#tasks'
end
