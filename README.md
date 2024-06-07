# Welcome to json-rpc-web3js test suite

[![CircleCI](https://circleci.com/gh/rsksmart/json-rpc-web3js/tree/master.svg?style=svg)](https://circleci.com/gh/rsksmart/json-rpc-web3js/tree/master)

# About

This is a Test Suite for Web3js compatibility validation of [RSKj](https://github.com/rsksmart/rskj).
It's implemented using NodeJS and Mocha and it's meant to test JSON RPC methods.
This is still a BETA but it's fully functional and tests can be incorporated.

## Configuration
Create the `.env` file in the root directory with the following variable:
```
TESTOMATIO=Testomat_API_KEY
```

# Getting Started

Prerequisites:
- npm
- RSKj node running on localhost and port 4444

Instructions:
- Clone this repository
- npm install
- `npm test` or `npm test:testomat` to load the test runs to testomat.

Detailed results report will available in ./Results using mocha-junit-reporter
This repository also includes CircleCI configuration for workflows on commit/builds and daily job.

## Synchronize tests in testomat
- Run the script `sync_tests_testomat`
