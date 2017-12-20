#!/usr/bin/env bash

# get node IP
#ip=$(docker exec $1 ifconfig eth0 | awk '/inet addr/{print substr($2,6)}')
ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $1)

# extract enode
if [[ $2 == "log" ]];then
  # read enode from logs
  enode=$(docker logs $1 2>&1 | grep enode | head -n 1)
else
  # read enode with geth
  enode=`docker exec $1 geth attach --exec "admin.nodeInfo" | grep enode | head -n 1`
  enode=$(echo $enode | sed "s/enode: \"//g" | sed "s/\",//g")
fi

# insert IP
enode=$(echo $enode | sed "s/\[\:\:\]/$ip/g")

echo "${enode#*self=}"