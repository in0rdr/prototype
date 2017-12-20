#!/bin/sh

sed -ie "s/localhost/$MONGODB_IP/g" config/mongoid.yml
sed -ie "s/MONGODB-USER/$MONGODB_USER/g" config/mongoid.yml
sed -ie "s/MONGODB-PWD/$MONGODB_PWD/g" config/mongoid.yml
rails s -p 3000 -b 0.0.0.0