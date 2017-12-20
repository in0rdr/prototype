#!/usr/bin/env bash

# reads current bootnode URL
#ENODE_LINE=$(docker logs $1 2>&1 | grep self=\"enode | head -n 1)
ENODE_LINE=`docker exec $1 geth attach --exec "admin.nodeInfo" | grep enode | head -n 1`
# replaces localhost by container IP
#MYIP=$(docker exec $BOOTNODE ifconfig eth0 | awk '/inet addr/{print substr($2,6)}')
MYIP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $1)
ENODE_LINE=$(echo $ENODE_LINE | sed "s/\[\:\:\]/$MYIP/g" | sed "s/\",//g" | sed "s/enode: \"//g")
echo $ENODE_LINE
