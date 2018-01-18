FROM node:8

ENV geth_peer 127.0.0.1
ENV ipfs_peer 127.0.0.1

RUN mkdir /simulator
WORKDIR /simulator

COPY contracts contracts
COPY compiler.js .
COPY utils.js .
COPY server.js .
COPY Customer.js .
COPY Mitigator.js .
COPY Target.js .
COPY Task.js .
COPY getTransactionReceiptMined.js .
COPY createIPs.py .
COPY package.json .

RUN npm install
RUN node -e "require('./compiler.js').compile()"

ENTRYPOINT ["sh", "-c", "npm start -- ${geth_peer} ${ipfs_peer}"]