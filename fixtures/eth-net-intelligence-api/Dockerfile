FROM node:8

ENV NETSTAT_IP localhost

RUN git clone https://github.com/cubedro/eth-net-intelligence-api
WORKDIR /eth-net-intelligence-api
RUN npm install && npm install -g pm2

COPY netstatconf.sh ./netstatconf.sh
COPY run.sh run.sh

ENTRYPOINT ["./run.sh"]