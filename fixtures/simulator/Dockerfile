FROM node:8

ENV geth_peer 127.0.0.1

COPY contracts /contracts
COPY compiler.js /compiler.js
COPY server.js /server.js
COPY getTransactionReceiptMined.js /getTransactionReceiptMined.js
COPY package.json /package.json

RUN npm install
RUN node -e "require('./compiler.js').compile()"

ENTRYPOINT ["sh", "-c", "npm start -- ${geth_peer}"]