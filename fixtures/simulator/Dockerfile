FROM node:8

ENV geth_peer 172.17.0.1
ENV ipfs_peer 172.17.0.1
ENV api_url http://172.17.0.1:3000

COPY app /simulator
WORKDIR /simulator

RUN npm install

ENTRYPOINT ["sh", "-c", "npm start -- ${geth_peer} ${ipfs_peer} ${api_url}"]