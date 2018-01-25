FROM node:8

ENV geth_peer 127.0.0.1
ENV ipfs_peer 127.0.0.1

COPY app /simulator
WORKDIR /simulator

RUN npm install

ENTRYPOINT ["sh", "-c", "npm start -- ${geth_peer} ${ipfs_peer}"]