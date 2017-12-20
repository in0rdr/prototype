#!/usr/bin/env bash
set -m
mongod &

# wait for mongoDB
RET=1
while [[ RET -ne 0 ]]; do
    sleep 1
    mongo admin --eval "help" > /dev/null
    RET=$?
done

# create admin
if [ ! -f /data/db/.mongodb_password_set ]; then
 mongo admin --eval 'db.createUser({ user: "root", pwd: "1234", roles: [ { role: "userAdminAnyDatabase", db: "admin" } ] });'
 touch /data/db/.mongodb_password_set
fi

fg
