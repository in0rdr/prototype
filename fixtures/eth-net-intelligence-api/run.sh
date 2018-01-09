#!/bin/bash

ws_server_uri="http://${NETSTAT_IP}:3000"
echo "Running eth-net-intelligence-api with WS_SERVER ${ws_server_uri}"

# create the config with all geth peers
bash netstatconf.sh $# prototype_peer $ws_server_uri 1234 $@ > app.json

cat app.json

pm2 start ./app.json
pm2 logs