#!/usr/bin/env bash

# Management utilities to clean up
# and start a fresh environment

# read container names
source .env

HOST_IP=`ip route|awk '/docker0/ { print $9 }'`

function down(){
  # Stop all prototype containers
  lines=`docker ps -a | grep 'prototype_' | wc -l`
  if [ "$lines" -gt 0 ]; then
    docker ps -a | grep 'prototype_' | awk '{print $1}' | xargs docker stop
  fi
}

function clean_all(){
  #docker volume ls -qf dangling=true | xargs -r docker volume rm

  # Clean all containers and prototype images
  clean_containers

  lines=`docker ps -a | grep 'prototype_' | wc -l`
  if [ "$lines" -gt 0 ]; then
    docker ps -a | grep 'prototype_' | awk '{print $1}' | xargs docker rm -f
  fi

  lines=`docker images | grep 'prototype' | wc -l`
  if [ "$lines" -gt 0 ]; then
    docker images | grep 'prototype' | awk '{print $1}' | xargs docker rmi -f
  fi
}

function clean_containers(){
  # Stop and remove all containers
  #
  # Removes all containers,
  # not only prototype containers
  
  lines=`docker ps -aq | wc -l`
  if [ "$lines" -gt 0 ]; then
   docker stop `docker ps -aq`
   docker rm -f `docker ps -aq`
  fi
}

function compile_contracts(){
  cd ../contracts
  npm run compile
  cd ../fixtures

  # copy contracts abi to simulator and api
  ./copycontracts.sh
}

function build(){
  echo "Compiling contracts"
  compile_contracts

  echo "Building prototype images"
  docker build -t prototype/bootnode:latest bootnode
  docker build -t prototype/geth:latest geth
  docker build -t prototype/eth-netstats:latest eth-netstats
  docker build -t prototype/eth-net-intelligence-api:latest eth-net-intelligence-api
}

function start_eth(){
  # Start the Ethereum ledger infrastructure
  docker run -d --name=$BOOTNODE prototype/bootnode:latest

  # get bootnode enode
  bootnode=`./getnodeurl.sh $BOOTNODE log`
  while [[ $bootnode != enode* ]]; do
    sleep 1
    bootnode=`./getnodeurl.sh $BOOTNODE log`
  done

  # run Ethereum nodes
  docker run -d -p 8545:8545 -p 30303:30303 -p 30303:30303/udp --name=$PEER1 prototype/geth:latest 1 $bootnode
  docker run -d --name=$PEER2 prototype/geth:latest 0 $bootnode
}

function restart_eth(){
  down
  docker rm $PEER1 $PEER2 $BOOTNODE
  start_eth
}

function start_sim(){
  compile_contracts
  #start_eth
  docker run -d --name=$IPFS ipfs/go-ipfs

  cd simulator
  ./copysimulator.sh
  docker build -t prototype/simulator:latest .
  
  # deploy the simulator
  sleep 3
  #peer2_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER2`
  ipfs_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $IPFS`
  docker run -d -e api_url="http://$HOST_IP:3000" -e geth_peer=$HOST_IP -e ipfs_peer=$ipfs_ip --name=$SIM prototype/simulator:latest
}

function restart_sim(){
  docker stop $SIM $IPFS
  docker rm $SIM $IPFS
  docker rmi prototype/simulator
  start_sim
}

function start_api(){
  #compile_contracts
  #start_eth

  cd api
  ./copyrails.sh
  docker build -t prototype/api:latest .

  docker run --name $REDIS -p 6379:6379 -d redis
  docker run --name=$MONGO -e "MONGO_INITDB_ROOT_USERNAME=root" -e "MONGO_INITDB_ROOT_PASSWORD=1234" -d mongo:latest
  #docker exec -it $MONGO mongo -u root -p 1234 --authenticationDatabase admin api_development

  redis_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $REDIS`
  mongo_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $MONGO`
  ipfs_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $IPFS`
  #geth_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER1`

  # read contract interfaces
  if [ -z "$1" ]; then
    rep_addr=`docker logs $SIM | grep ' Reputation:' | awk '{print $2}'`
  fi
  if [ -z "$2" ]; then
    mitgn_addr=`docker logs $SIM | grep ' Mitigation:' | awk '{print $2}'`
  fi
  if [ -z "$3" ]; then
    id_addr=`docker logs $SIM | grep ' Identity:' | awk '{print $2}'`
  fi

  # run sidekiq worker and api
  docker run -d -p 3000:3000 -e "ETHEREUM_RPC_URL=http://$HOST_IP:8545"\
             -e "IPFS_GATEWAY=$ipfs_ip:8080"\
             -e "IDENTITY_ADDR=$id_addr" -e "MITGN_ADDR=$mitgn_addr" -e "REP_ADDR=$rep_addr"\
             -e "REDIS_URL=redis://$redis_ip:6379/0" -e "MONGODB_IP=$mongo_ip" -e "MONGODB_USER=root" -e "MONGODB_PWD=1234"\
             --name=$API prototype/api:latest
  # docker exec -it $API tail -F log/sidekiq.log -n 50
  # docker exec -it $API tail -F log/development.log -n 50
}

function restart_api(){
  docker stop $API $REDIS $MONGO
  docker rm $API $REDIS $MONGO
  docker rmi prototype/api
  start_api
}

function netstats(){
  start_eth
  docker stop $NETSTATS $NETSTATS_INTEL
  docker rm $NETSTATS $NETSTATS_INTEL

  docker run -d --name=$NETSTATS prototype/eth-netstats:latest
  netstats_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $NETSTATS`
  peer1_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER1`
  peer2_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER2`
  docker run -d -e "NETSTAT_IP=$netstats_ip" --name=$NETSTATS_INTEL prototype/eth-net-intelligence-api:latest $peer1_ip $peer2_ip
}

case "$1" in
  down)
    down
    ;;
  clean_all) 
    clean_all
    ;;
  clean_containers)
    clean_containers
    ;;
  compile_contracts)
    compile_contracts
    ;;
  build)
    build
    ;;
  start_eth)
    start_eth
    ;;
  restart_eth)
    restart_eth
    ;;
  start_sim)
    start_sim
    ;;
  restart_sim)
    restart_sim
    ;;
  start_api)
    start_api
    ;;
  restart_api)
    restart_api
    ;;
  netstats)
    netstats
    ;;
  *)
    echo $"Usage: $0 { down | clean_all | clean_containers | compile_contracts | build | start_eth | start_sim | start_api | netstats }"
    exit 1
esac
