#!/bin/bash
ENODE_LINE=$(docker logs $1 2>&1 | grep enode | head -n 1)
MYIP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $1)
ENODE_LINE=$(echo $ENODE_LINE | sed "s/127\.0\.0\.1/$MYIP/g" | sed "s/\[\:\:\]/$MYIP/g")
echo "${ENODE_LINE#*self=}"