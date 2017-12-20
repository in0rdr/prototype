#!/usr/bin/env bash
# Cleanup and start a fresh env.

PEER1="prototype_peer1"
PEER2="prototype_peer2"
BOOTNODE="prototype_bootnode"
MONGO="prototype_mongo"
IPFS="prototype_ipfs"

if [ ! -e "docker-compose.yaml" ];then
  echo "docker-compose.yaml not found."
  exit 8
fi

function clean(){

  lines=`docker ps -a | grep 'prototype_' | wc -l`

  if [ "$lines" -gt 0 ]; then
    docker ps -a | grep 'prototype_' | awk '{print $1}' | xargs docker rm -f
  fi

  lines=`docker images | grep 'prototype' | wc -l`
  if [ "$lines" -gt 0 ]; then
    docker images | grep 'thesis' | awk '{print $1}' | xargs docker rmi -f
  fi

  # lines=`docker ps -aq | wc -l`
  # if [ "$lines" -gt 0 ]; then
  #  docker stop -f `docker ps -aq`
  #  docker rm -f `docker ps -aq`
  # fi

  echo "Building prototype images (if not latest already)"
  docker build -t prototype/bootnode:latest bootnode
  docker build -t prototype/geth:latest geth
  docker build -t prototype/mongo:latest mongo

}

function up(){
  docker run -d --name=$IPFS ipfs/go-ipfs

  docker run -d --name=$MONGO prototype/mongo:latest

  docker run -d --name=$BOOTNODE prototype/bootnode:latest

  # get bootnode enode
  bootnode=`./getnodeurl.sh $BOOTNODE log`
  while [[ $bootnode != enode* ]]; do
    sleep 1
    bootnode=`./getnodeurl.sh $BOOTNODE log`
  done

  docker run -d --name=$PEER1 prototype/geth:latest 1 $bootnode
  docker run -d --name=$PEER2 prototype/geth:latest 0 $bootnode
}

function down(){
  docker stop $PEER1
  docker stop $PEER2
  docker stop $BOOTNODE
  docker stop $MONGO
  docker stop $IPFS
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
        clean)
            clean
            ;;
        restart)
            down
            clean
            up
            ;;

        *)
            echo $"Usage: $0 {up|down|clean|restart}"
            exit 1

esac
done
