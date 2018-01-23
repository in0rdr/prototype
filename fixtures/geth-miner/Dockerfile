FROM alpine:3.5

RUN \
  apk add --update go git make gcc musl-dev linux-headers ca-certificates && \
  git clone --depth 1 --branch release/1.7 https://github.com/ethereum/go-ethereum && \
  (cd go-ethereum && make geth)
  #cp go-ethereum/build/bin/geth /geth && \
  #apk del go git make gcc musl-dev linux-headers && \
  #rm -rf /go-ethereum && rm -rf /var/cache/apk/*

ENV PATH="${PATH}:/go-ethereum/build/bin/"
ADD genesis.json /genesis.json

# create coinbase
RUN echo 1234 > pwd.txt
RUN geth --password pwd.txt account new > acc.txt

# init geth with the etherbase
ADD initgeth.sh /initgeth.sh
RUN chmod +x /initgeth.sh
RUN ./initgeth.sh $(cat acc.txt | awk '{print substr ($2, 2, 40)}')

# unlock account and run
ADD rungeth.sh /rungeth.sh
RUN chmod +x /rungeth.sh

EXPOSE 8545
EXPOSE 30303 30303/udp

ENTRYPOINT ["./rungeth.sh"]

