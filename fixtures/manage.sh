#!/usr/bin/env bash
# Cleanup and start a fresh env.

PEER1="prototype_peer1"
PEER2="prototype_peer2"
BOOTNODE="prototype_bootnode"
MONGO="prototype_mongo"
IPFS="prototype_ipfs"
API="prototype_api"
SIM="prototype_simulator"
NETSTATS="prototype_netstats"
NETSTATS_INTEL="prototype_netstats-intel"

# if [ ! -e "docker-compose.yaml" ];then
#   echo "docker-compose.yaml not found."
#   exit 8
# fi

function clean(){
  lines=`docker ps -a | grep 'prototype_' | wc -l`

  if [ "$lines" -gt 0 ]; then
    docker ps -a | grep 'prototype_' | awk '{print $1}' | xargs docker rm -f
  fi

  lines=`docker images | grep 'prototype' | wc -l`
  if [ "$lines" -gt 0 ]; then
    docker images | grep 'prototype' | awk '{print $1}' | xargs docker rmi -f
  fi
}

function clear_containers(){
  lines=`docker ps -aq | wc -l`
  if [ "$lines" -gt 0 ]; then
   docker stop `docker ps -aq`
   docker rm -f `docker ps -aq`
  fi
}

function build(){
  echo "Copying contracts and rails web app for deployment"
  sh ./copycontracts.sh
  sh ./copyrails.sh

  echo "Building prototype images (if not latest already)"
  docker build -t prototype/mongo:latest mongo
  docker build -t prototype/api:latest api
  docker build -t prototype/bootnode:latest bootnode
  docker build -t prototype/geth:latest geth
  docker build -t prototype/simulator:latest simulator
  docker build -t prototype/eth-netstats:latest eth-netstats
  docker build -t prototype/eth-net-intelligence-api:latest eth-net-intelligence-api
}

function up(){
  docker run -d --name=$IPFS ipfs/go-ipfs
  docker run -d --name=$MONGO prototype/mongo:latest
  mongo_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $MONGO`
  docker run -d -e "MONGODB_IP=$mongo_ip" -e "MONGODB_USER=root" -e "MONGODB_PWD=1234" --name=$API prototype/api:latest
  docker run -d --name=$BOOTNODE prototype/bootnode:latest

  # get bootnode enode
  bootnode=`./getnodeurl.sh $BOOTNODE log`
  while [[ $bootnode != enode* ]]; do
    sleep 1
    bootnode=`./getnodeurl.sh $BOOTNODE log`
  done

  docker run -d -p 8545:8545/tcp --name=$PEER1 prototype/geth:latest 1 $bootnode
  docker run -d --name=$PEER2 prototype/geth:latest 0 $bootnode

  # deploy the simulator
  sleep 3
  peer1_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER1`
  ipfs_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $IPFS`
  docker run -d -e geth_peer=$peer1_ip -e ipfs_peer=$ipfs_ip --name=$SIM prototype/simulator:latest

  # deploy netstats
  docker run -d --name=$NETSTATS prototype/eth-netstats:latest
  netstats_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $NETSTATS`
  peer2_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER2`
  docker run -d -e "NETSTAT_IP=$netstats_ip" --name=$NETSTATS_INTEL prototype/eth-net-intelligence-api:latest $peer1_ip $peer2_ip
}

function down(){
  docker stop $NETSTATS $NETSTATS_INTEL \
  $SIM $PEER1 $PEER2 $BOOTNODE \
  $API $MONGO $IPFS
}

function sim_start(){
  docker run -d --name=$BOOTNODE prototype/bootnode:latest

  # get bootnode enode
  bootnode=`./getnodeurl.sh $BOOTNODE log`
  while [[ $bootnode != enode* ]]; do
    sleep 1
    bootnode=`./getnodeurl.sh $BOOTNODE log`
  done

  docker run -d -p 8545:8545/tcp --name=$PEER1 prototype/geth:latest 1 $bootnode
  docker run -d --name=$PEER2 prototype/geth:latest 0 $bootnode

  # deploy the simulator
  sleep 3
  peer1_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER1`
  ipfs_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $IPFS`
  docker run -d -e geth_peer=$peer1_ip -e ipfs_peer=$ipfs_ip --name=$SIM prototype/simulator:latest

  # deploy netstats
  docker run -d --name=$NETSTATS prototype/eth-netstats:latest
  netstats_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $NETSTATS`
  peer2_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER2`
  docker run -d -e "NETSTAT_IP=$netstats_ip" --name=$NETSTATS_INTEL prototype/eth-net-intelligence-api:latest $peer1_ip $peer2_ip
}

function sim_restart(){
  docker stop $API $MONGO $SIM

  lines=`docker ps -a | grep $SIM | wc -l`
  if [ "$lines" -eq 1 ]; then
    docker ps -a | grep $SIM | awk '{print $1}' | xargs docker rm -f
  fi

  lines=`docker images | grep 'prototype/simulator' | wc -l`
  if [ "$lines" -eq 1 ]; then
    docker images | grep 'prototype/simulator' | awk '{print $1}' | xargs docker rmi -f
  fi

  docker build -t prototype/simulator:latest simulator
  peer1_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $PEER1`
  ipfs_ip=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $IPFS`
  docker run -d -e geth_peer=$peer1_ip -e ipfs_peer=$ipfs_ip --name=$SIM prototype/simulator:latest
}

for opt in "$@"
do

    case "$opt" in
        up)
            up
            ;;
        down)
            down
            ;;
        build)
            build
            ;;
        rebuild)
            clean
            build
            ;;
        clean)
            clean
            ;;
        clear_containers)
            clear_containers
            ;;
        soft_restart)
            down
            up
            ;;
        sim_start)
            sim_start
            ;;
        sim_restart)
            sim_restart
            ;;
        restart)
            down
            clean
            build
            up
            ;;

        *)
            echo $"Usage: $0 {up|down|build|rebuild|clean|clear_containers|soft_restart|sim_start|sim_restart|restart}"
            exit 1

esac
done
