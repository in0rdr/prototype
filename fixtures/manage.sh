#!/usr/bin/env bash
# Cleanup and start a fresh env.

PEER1="fixtures_peer1"
PEER2="fixtures_peer2"
BOOTNODE="fixtures_bootnode"
MONGO="fixtures_mongo"

if [ ! -e "docker-compose.yaml" ];then
  echo "docker-compose.yaml not found."
  exit 8
fi

function clean(){

  lines=`docker ps -a | grep 'fixtures_' | wc -l`

  if [ "$lines" -gt 0 ]; then
    docker ps -a | grep 'fixtures_' | awk '{print $1}' | xargs docker rm -f
  fi

  lines=`docker images | grep 'thesis' | wc -l`
  if [ "$lines" -gt 0 ]; then
    docker images | grep 'thesis' | awk '{print $1}' | xargs docker rmi -f
  fi

  # lines=`docker ps -aq | wc -l`
  # if [ "$lines" -gt 0 ]; then
  #  docker stop -f `docker ps -aq`
  #  docker rm -f `docker ps -aq`
  # fi

  echo "Building thesis images (if not latest already)"
  docker build -t thesis/bootnode:latest bootnode
  docker build -t thesis/geth:latest geth
  docker build -t thesis/mongo:latest mongo

}

function up(){
  #docker-compose up --force-recreate &

  docker run -d --name=$MONGO thesis/mongo:latest

  docker run -d --name=$BOOTNODE thesis/bootnode:latest

  # get bootnode enode
  bootnode=`./getbootnodeurl.sh $BOOTNODE`
  while [[ $bootnode != enode* ]]; do
    sleep 1
    bootnode=`./getbootnodeurl.sh $BOOTNODE`
  done

  docker run -d --name=$PEER1 thesis/geth:latest 1 $bootnode
  docker run -d --name=$PEER2 thesis/geth:latest 0 $bootnode

  # get peer2 enode
  peer2enode=`./getnodeurl.sh $PEER2`
  while [[ $peer2enode != enode* ]]; do
    sleep 5
    peer2enode=`./getnodeurl.sh $PEER2`
  done

  # sync nodes
  #docker exec $PEER1 geth attach --exec "admin.addPeer(\"$peer2enode\")"

  #fg
}

function down(){
  docker stop $PEER1
  docker stop $PEER2
  #docker-compose down;
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
