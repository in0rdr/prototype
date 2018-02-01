# Prototype

[![Build Status](https://travis-ci.org/in0rdr/prototype.svg?branch=master)](https://travis-ci.org/in0rdr/prototype) [![Coverage Status](https://coveralls.io/repos/github/in0rdr/prototype/badge.svg?branch=master)](https://coveralls.io/github/in0rdr/prototype?branch=master)

## Project Structure
* `/api`: Reputation API, Rail skeleton generated with `rails new . --api --skip-active-record`. Afterwards configured with [mongoid](api/config/mongoid.yml). The `sidekiq-scheduler` is configured in [/api/config/sidekiq.yml](api/config/sidekiq.yml). This scheduler executes library code located in [/api/app/lib/decentral.rb](api/app/lib/decentral.rb), receives new mitigation contracts from the blockchain and writes them to the database at an interval of 15s. The library file [api/app/lib/reputon_utils.rb](api/app/lib/reputon_utils.rb) holds utility functions used by the controller methods, to fetch reputons from the blockchain and IPFS. The general API documentation is accesible via [http://localhost:3000/apipie](http://localhost:3000/apipie) or can be compiled statically with the command `rake apipie:static` in the `/api` directory (output in `/api/doc`).
* `/contracts`: Holds the Ethereum smart contracts. Run `cd /contracts && npm run compile` to compile. Mitigation tasks are stored in an array in the `Mitigation` contract. The IFPS hashes to the reputation data is stored in mappings inside the `Reputation` smart contract. The `Identity` contract holds the customers.
* `/test` and `/migrations`: Solidity unit tests. Type `npm run test` from the project root to start testrpc/ganache and run the tests. Run `npm run coverage` for test coverage.
* `/simulator`: This contains the simulation code used to evaluate the prototype. The simulator can run in two modes: test mode and production mode. In test mode, the simulator creates and runs a mitigation task for every combination (30 in total) of mitigator/target strategy. Afterwards it halts. In production mode, the simulator creates new tasks on a regular basis and assigns random mitigator/target strategies.
* `/fixtures`: Contains all Dockerfiles to recreate the test infrastructure. The [/fixtures/manage.sh](fixtures/manage.sh) script contains all the relevant snippets to run the Ethereum infrastructure, the simulator and the reputation API. Additionally, it contains snippets to clean the work/build environment.

## Monitoring the Ethereum Infrastructure

```
source .env
cd fixtures
./manage.sh netstats
```

Run `docker logs $NETSTATS_INTEL | head -n1` to get netstat url:

```
Running eth-net-intelligence-api with WS_SERVER http://172.17.0.6:3000
```

The setup comprises two geth nodes, "$PEER1=prototype_peer1" and "$PEER2=prototype_peer2". The former is a mining peer.

## Solidity Tests
- `npm run test` starts testrpc and runs the tests
- `npm run coverage` to see test coverage

## Simulator
`source .env && watch -n 1 docker logs $SIM` and wait for the contracts to be deployed.

Run [Remix IDE (http)](http://remix.ethereum.org) and connect with Web3 to play with the contracts. You can directly use the default `http://127.0.0.1:8545` connection, because port mapping is enabled for `$PEER1`.
