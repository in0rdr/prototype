# Prototype

[![Build Status](https://travis-ci.org/in0rdr/prototype.svg?branch=master)](https://travis-ci.org/in0rdr/prototype) [![Coverage Status](https://coveralls.io/repos/github/in0rdr/prototype/badge.svg?branch=master)](https://coveralls.io/github/in0rdr/prototype?branch=master)

## Development Environment

```
cd fixtures
./manage.sh restart
```

Run `docker logs prototype_netstats-intel | head -n1` to monitor nodes / get netstat url:

```
Running eth-net-intelligence-api with WS_SERVER http://172.17.0.6:3000
```

The setup comprises two geth nodes, "prototype_peer1" and "prototype_peer2". The former is a mining peer.

## Solidity Tests
- `npm run test` starts testrpc and runs the tests
- `npm run coverage` to see test coverage

## Simulator
`watch -n 1 docker logs prototype_simulator` and wait for the contracts to be deployed.

Run [Remix IDE (http)](http://remix.ethereum.org) and connect with Web3 to play with the contracts.

Use `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' prototype_peer1` to get the IP of peer1. RPC port is **8545** for both nodes.
