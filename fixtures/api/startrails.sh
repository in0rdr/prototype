#!/bin/sh

perl -pe "BEGIN{undef $/;} s/hosts:.*?options:/hosts:\n        - $MONGODB_IP:27017\n      options:/smg" -i config/mongoid.yml
sed -ie "s@user: '.*'@user: '$MONGODB_USER'@g" config/mongoid.yml
sed -ie "s@password: '.*'@password: '$MONGODB_PWD'@g" config/mongoid.yml
rails s -p 3000 -b 0.0.0.0