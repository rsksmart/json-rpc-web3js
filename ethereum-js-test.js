const assert = require('chai').assert;
const Web3 = require('web3');
const {
  ethers
} = require("ethers");
const BN = require('bignumber.js');
const fs = require('fs');
const path = require('path');

describe(`Rskj ethers.js Smoke Tests`, function () {
  this.timeout(10000);

  let PRIVATE_KEY = '0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4'; //cow

  let testAccount = '0x0000000000000000000000000000000001000006';
  let contractAddress = '';
  let trxHash = '';
  let web3;
  var provider;
  let web3Provider;
  before(async () => {
    
      let url = "http://127.0.0.1:4444";
      provider = new ethers.providers.JsonRpcProvider(url);
      const signer = provider.getSigner();
      web3 = new Web3('http://127.0.0.1:4444', null, {
        transactionConfirmationBlocks: 1
      });
      web3.evm = {
        mine: () => web3.currentProvider.send('evm_mine')
      };
     /* let currentProvider = new Web3.providers.HttpProvider('http://localhost:4444');
      web3Provider = new ethers.providers.Web3Provider(currentProvider);*/    
  });

  it('Network should be RSK', async () => {
    // web3_clientVersion
    let network = await provider.getNetwork();
    assert(network.chainId == 33, "ChainId should be 33 but it's : " + network.chainId);
    let clientVersion = await provider.send("web3_clientVersion")
    assert(clientVersion.indexOf('RskJ') >= 0, "Network should be RSK but is :" + clientVersion);
  })

});