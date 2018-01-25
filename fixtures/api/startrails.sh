#!/bin/sh

# configure mongo db
perl -pe "BEGIN{undef $/;} s/hosts:.*?options:/hosts:\n        - $MONGODB_IP:27017\n      options:/smg" -i config/mongoid.yml
sed -ie "s@user: '.*'@user: '$MONGODB_USER'@g" config/mongoid.yml
sed -ie "s@password: '.*'@password: '$MONGODB_PWD'@g" config/mongoid.yml

# rund sidekiq worker
#ETHEREUM_RPC_URL=$ETHEREUM_RPC_URL MITGN_ADDR=$mitgn_addr REP_ADDR=$REP_ADDR REDIS_URL=$REDIS_URL
bundle exec sidekiq -r ./app/workers/get_reputons.rb

rails s -p 3000 -b 0.0.0.0