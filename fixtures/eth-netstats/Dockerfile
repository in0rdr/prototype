FROM node:8-alpine

ENV WS_SECRET 1234

RUN apk add --update git

RUN git clone https://github.com/cubedro/eth-netstats

WORKDIR /eth-netstats

RUN npm install
RUN npm install -g grunt-cli
RUN grunt

EXPOSE 3000

CMD ["npm", "start"]