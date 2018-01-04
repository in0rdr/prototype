# Prototype

[![Build Status](https://travis-ci.org/in0rdr/prototype.svg?branch=master)](https://travis-ci.org/in0rdr/prototype) [![Coverage Status](https://coveralls.io/repos/github/in0rdr/prototype/badge.svg?branch=master)](https://coveralls.io/github/in0rdr/prototype?branch=master)

## Development Environment

```
cd fixtures
./manage.sh restart
```

## Solidity Tests
- `npm run test` starts testrpc and runs the tests
- `npm run coverage` to see test coverage

## Simulator
`watch -n 1 docker logs prototype_simulator` and wait for the contracts to be deployed.

Run Remix IDE to play with the contracts.