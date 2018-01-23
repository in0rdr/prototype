FROM alpine:3.5

RUN \
  apk add --update go git make gcc musl-dev linux-headers ca-certificates && \
  git clone --depth 1 --branch release/1.7 https://github.com/ethereum/go-ethereum && \
  (cd go-ethereum && make all)
  #cp go-ethereum/build/bin/geth /geth && \
  #apk del go git make gcc musl-dev linux-headers && \
  #rm -rf /go-ethereum && rm -rf /var/cache/apk/*

ENV PATH="${PATH}:/go-ethereum/build/bin/"
RUN bootnode -genkey boot.key

EXPOSE 30301 30301/udp

CMD ["bootnode", "-nodekey=boot.key", "-verbosity=9"]

