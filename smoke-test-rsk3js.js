const assert = require('chai').assert;
const Rsk3 = require('@rsksmart/rsk3');
const BN = require('bignumber.js');
const fs = require('fs');
const path = require('path');

describe('Rskj rsk3js Smoke Tests', function () {
  this.timeout(10000);
  let rsk3;

  let PRIVATE_KEY = '0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4'; //cow

  let testAccount = '0x0000000000000000000000000000000001000006';
  let contractAddress = '';
  let trxHash = '';


  before(async () => {
    rsk3 = new Rsk3('http://127.0.0.1:4444', null, { transactionConfirmationBlocks: 1 });

    rsk3.evm = {
      mine: () => rsk3.currentProvider.send('evm_mine')
    };
  });

  it('Network should be RSK', async () => {
    // web3_clientVersion
    let clientVersion = await rsk3.getNodeInfo();
    assert(clientVersion.indexOf('RskJ') >= 0, "Network should be RSK but is :" + clientVersion);

  })

  it('Should advance until block 5', async () => {
    let blockNumber = await rsk3.getBlockNumber();
    for (let i = blockNumber; i < 5; i++) {
      await rsk3.evm.mine();
    }
    blockNumber = await rsk3.getBlockNumber();
    assert.isAbove(blockNumber, 4);
  })

  it('Should have all the simple cached methods work', async () => {

    // eth_hashrate
    let hashRate = await rsk3.getHashrate();
    assert.equal(hashRate, '0');

    // eth_syncing
    let isSyncing = await rsk3.isSyncing();
    if (typeof isSyncing === 'object') {
      assert.containsAllKeys(isSyncing, ['currentBlock', 'highestBlock', 'startingBlock']);
      assert.isAbove(isSyncing.currentBlock, 0);
      assert.isAbove(isSyncing.highestBlock, 0);
      assert.isAbove(isSyncing.startingBlock, 0);
    } else {
      assert.equal(isSyncing, false);
    }

    // net_listening
    let isListening = await rsk3.net.isListening();
    assert(isListening);

    // net_peerCount
    let peerCount = await rsk3.net.getPeerCount();
    assert.isAbove(peerCount, -1);


    // net_version
    let networkId = await rsk3.net.getId();
    assert.equal(networkId, 33);

    // eth_accounts
    let accounts = await rsk3.getAccounts();
    assert.isArray(accounts);

    // eth_protocolVersion
    let protocolVersion = await rsk3.getProtocolVersion();
    assert.equal(protocolVersion, '62');

    // eth_mining
    let isMining = await rsk3.isMining();
    assert.equal(isMining, true);

  });

  // eth_blockNumber
  it('eth_blockNumber: Should get the current block number', async () => {
    let blockNumber = await rsk3.getBlockNumber();
    assert.isAbove(blockNumber, 4);
  });

  // eth_gasPrice
  it('eth_gasPrice: Should get the gas price', async () => {
    let gasPrice = new BN(await rsk3.getGasPrice());
    assert.equal(gasPrice.toNumber(), '0');
  });

  // eth_getTransactionCount
  it('eth_getTransactionCount: Should get an accounts transaction count', async () => {
    let transactionCount = await rsk3.getTransactionCount(
      testAccount,
      'latest'
    );
    assert.equal(transactionCount, '0');
  });

  // eth_getBalance
  it('eth_getBalance: Should get a the right balance for an account', async () => {
    let balance = new BN(await rsk3.getBalance(
      testAccount,
      'latest'
    ));
    assert.equal(balance.toNumber(), '21000000000000000000000000');

    let historicBalance = new BN(await rsk3.getBalance(
      testAccount,
      0
    ));
    let expectedHistoricBalance = new BN(21000000000000000000000000);
    assert.equal(historicBalance.minus(expectedHistoricBalance).toNumber(), 0);

    let unusedAccountBalance = new BN(await rsk3.getBalance(
      '0x09a1eda29f664ac8f68106f6567276df0c65d859',
      'latest'
    ));
    assert.equal(unusedAccountBalance.toNumber(), '1000000000000000000000000000000');
  });

  // eth_getTransactionByBlockHashAndIndex
  // eth_getTransactionByBlockNumberAndIndex
  it('eth_getTransactionByBlockHashAndIndex-eth_getTransactionByBlockNumberAndIndex: Should get transactions by block number and hash', async () => {
    let blockNumber = 1;
    let byBlockNumber = await rsk3.getTransactionFromBlock(blockNumber, 0);
    let blockHash = byBlockNumber.blockHash;
    let byHash = await rsk3.getTransactionFromBlock(blockHash, 0);

    assert.deepEqual(byBlockNumber, byHash);

    let invalidBlock = await rsk3.getTransactionFromBlock('0xdeadbeef0fb9424aad2417321cac62915f6c83827f4d3c8c8c06900a61c4236c', 0);
    assert.isNull(invalidBlock);
  });

  // eth_getBlockTransactionCountByHash
  // eth_getBlockTransactionCountByNumber
  it(`eth_getBlockTransactionCountByHash-eth_getBlockTransactionCountByNumber: Should return the right number of block transactions`, async () => {
    let expectedCount = 1;
    let blockNumber = 4;
    let byBlockNumber = await rsk3.getTransactionFromBlock(blockNumber, 0);
    let blockHash = byBlockNumber.blockHash;

    let byHash = await rsk3.getBlockTransactionCount(blockHash);
    assert.equal(byHash, expectedCount);

    let byNumber = await rsk3.getBlockTransactionCount(blockNumber);
    assert.equal(byNumber, expectedCount);
  });

  //eth_call
  //eth_sendRawTransaction
  it('eth_sendRawTransaction & eth_call: Should compile and deploy a contract successfully and interact with that contract', async function () {
    this.timeout(20000);
    let compiledHelloWorldPath = path.resolve(__dirname, 'Contracts', 'HelloWorld.json');
    let compiledContract = fs.readFileSync(compiledHelloWorldPath, 'UTF-8');
    let contractOutput = JSON.parse(compiledContract);
    let abi = contractOutput.abi;
    let contract = new rsk3.Contract(abi);
    let signedAccount = rsk3.accounts.privateKeyToAccount(PRIVATE_KEY);
    let deployment = contract.deploy({ data: '0x6080604052600560005534801561001557600080fd5b5060ff806100246000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780636d4ce63c146062575b600080fd5b606060048036036020811015604b57600080fd5b8101908080359060200190929190505050607e565b005b606860c1565b6040518082815260200191505060405180910390f35b806000819055507f93fe6d397c74fdf1402a8b72e47b68512f0510d7b98a4bc4cbdf6ac7108b3c596000546040518082815260200191505060405180910390a150565b6000805490509056fea265627a7a72305820c73a787ed29a46f8a85631abd07c906d900ca03c03b631cc85fe396408072ee164736f6c634300050a0032', arguments: [] });

    let contractData = deployment.encodeABI();

    let transaction = {
      value: 0,
      gasPrice: rsk3.utils.toHex(10000000),
      gas: rsk3.utils.toHex(1000000),
      data: contractData,
      chainId: 33
    };

    let signedTx = await signedAccount.signTransaction(transaction);
    let txReceipt = await rsk3.sendSignedTransaction(signedTx.rawTransaction);
    assert(txReceipt.contractAddress);
    contractAddress = txReceipt.contractAddress;

    let deployedContract = new rsk3.Contract(abi, txReceipt.contractAddress);

    let getCall = deployedContract.methods.get();
    let callParams = {
      to: txReceipt.contractAddress,
      data: getCall.encodeABI(),
    };

    let currentVal = await rsk3.call(callParams);
    assert.equal(currentVal, '0x0000000000000000000000000000000000000000000000000000000000000005');

    let currentValLatest = await rsk3.call(callParams, "latest");
    assert.equal(currentValLatest, '0x0000000000000000000000000000000000000000000000000000000000000005');

    let currentValPending = await rsk3.call(callParams, "pending");
    assert.equal(currentValPending, '0x0000000000000000000000000000000000000000000000000000000000000005');

    let setCall = deployedContract.methods.set(34);
    let setGasEstimate = await setCall.estimateGas({ from: signedAccount.address });
    let transactionParameters = {
      to: txReceipt.contractAddress,
      from: signedAccount.address,
      gasPrice: '0x4A817C800', // 20000000000
      gas: setGasEstimate,
      data: setCall.encodeABI(),
      chainId: 33
    };

    let setSignedTx = await signedAccount.signTransaction(transactionParameters);

    // Send the transaction.
    let receipt = await rsk3.sendSignedTransaction(setSignedTx.rawTransaction)
      .once('transactionHash', (hash) => {
        assert.isString(hash);
        trxHash = hash;
      })
      .on('error', (error) => {
        assert(false, `Unexpected error sending set transaction: $`);
      });
    assert.isObject(receipt);
    let receiptString = JSON.stringify(receipt);
    assert(receiptString.indexOf('transactionHash') > 0, "transactionHash is not being returned and it's expected!");
    assert(receiptString.indexOf('transactionIndex') > 0, "transactionIndex is not being returned and it's expected!");
    assert(receiptString.indexOf('blockHash') > 0, "blockHash is not being returned and it's expected!");
    assert(receiptString.indexOf('blockNumber') > 0, "blockNumber is not being returned and it's expected!");
    assert(receiptString.indexOf('cumulativeGasUsed') > 0, "cumulativeGasUsed is not being returned and it's expected!");
    assert(receiptString.indexOf('gasUsed') > 0, "gasUsed is not being returned and it's expected!");
    assert(receiptString.indexOf('contractAddress') > 0, "contractAddress is not being returned and it's expected!");
    assert(receiptString.indexOf('logs') > 0, "logs is not being returned and it's expected!");
    assert(receiptString.indexOf('from') > 0, "from is not being returned and it's expected!");
    assert(receiptString.indexOf('to') > 0, "to is not being returned and it's expected!");
    assert(receiptString.indexOf('root') > 0, "root is not being returned and it's expected!");
    assert(receiptString.indexOf('status') >0, "status is not being returned and it's expected!");
    assert(receiptString.indexOf('logsBloom') > 0, "logsBloom is not being returned and it's expected!");

    await new Promise((res) => setTimeout(res, 5000));

    await deployedContract.getPastEvents('ValueChanged', { fromBlock: 0, toBlock: 'latest' }, (error, eventLogs) => {
      assert(!error, `Unexpected error reading logs ${error}`);
      assert.equal(eventLogs[0].returnValues.newValue, "34");
    });
  });

  // eth_getCode
  it(`eth_getCode: Should return the contract's code`, async () => {
    let contractCode = await rsk3.getCode(contractAddress, 'latest');
    assert.equal(contractCode, '0x6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780636d4ce63c146062575b600080fd5b606060048036036020811015604b57600080fd5b8101908080359060200190929190505050607e565b005b606860c1565b6040518082815260200191505060405180910390f35b806000819055507f93fe6d397c74fdf1402a8b72e47b68512f0510d7b98a4bc4cbdf6ac7108b3c596000546040518082815260200191505060405180910390a150565b6000805490509056fea265627a7a72305820c73a787ed29a46f8a85631abd07c906d900ca03c03b631cc85fe396408072ee164736f6c634300050a0032');
    let accountCount = await rsk3.getCode(testAccount, 'earliest');
    assert.equal('0x00', accountCount);

    let invalidAccount = await rsk3.getCode('0x0000000000000000000000000000000000000001', 'latest');
    assert.equal('0x00', invalidAccount);
  });

  // eth_getBlockByHash
  // eth_getBlockByNumber
  it(`eth_getBlockByHash-eth_getBlockByNumber: Should get the block by hash and number`, async () => {
    this.timeout(20000);
    let blockNumber = '2';
    let byNumber = await rsk3.getBlock(blockNumber);
    let blockHash = byNumber.hash;
    let byHash = await rsk3.getBlock(blockHash);

    assert.deepEqual(byHash, byNumber);

    let withTransactions = await rsk3.getBlock(blockHash, true);
    assert.equal(withTransactions.transactions.length, 1);
    assert.isObject(withTransactions.transactions[0]);
  });

  // eth_getTransactionByHash
  it(`eth_getTransactionByHash: Should get a transaction by its hash`, async () => {
    let tx = await rsk3.getTransaction(trxHash);
    assert.isObject(tx);
    let txString = JSON.stringify(tx);
    assert(txString.indexOf('hash') > 0, "hash is not being returned and it's expected!");
    assert(txString.indexOf('transactionIndex') > 0, "transactionIndex is not being returned and it's expected!");
    assert(txString.indexOf('blockHash') > 0, "blockHash is not being returned and it's expected!");
    assert(txString.indexOf('blockNumber') > 0, "blockNumber is not being returned and it's expected!");
    assert(txString.indexOf('value') > 0, "value is not being returned and it's expected!");
    assert(txString.indexOf('input') > 0, "input is not being returned and it's expected!");
    assert(txString.indexOf('from') > 0, "from is not being returned and it's expected!");
    assert(txString.indexOf('to') > 0, "to is not being returned and it's expected!");
    assert(txString.indexOf('gasPrice') > 0, "gasPrice is not being returned and it's expected!");
    assert(txString.indexOf('gas') > 0, "gas is not being returned and it's expected!");
    assert(txString.indexOf('"v"') > 0, "v: is not being returned and it's expected!");
    assert(txString.indexOf('"r"') > 0, "r: is not being returned and it's expected!");
    assert(txString.indexOf('"s"') > 0, "s: is not being returned and it's expected!");

    let invalidTx = await rsk3.getTransaction('0x5eae996aa609c0b9db434c7a2411437fefc3ff16046b71ad102453cfdeadbeef');
    assert.isNull(invalidTx);
  });

  // eth_getTransactionReceipt
  it(`eth_getTransactionReceipt: Should get transaction receipt`, async () => {

    let receipt = await rsk3.getTransactionReceipt(trxHash);
    assert.isObject(receipt);
    let receiptString = JSON.stringify(receipt);
    assert(receiptString.indexOf('transactionHash') >= 0, "transactionHash is not being returned and it's expected!");
    assert(receiptString.indexOf('transactionIndex') >= 0, "transactionIndex is not being returned and it's expected!");
    assert(receiptString.indexOf('blockHash') >= 0, "blockHash is not being returned and it's expected!");
    assert(receiptString.indexOf('blockNumber') >= 0, "blockNumber is not being returned and it's expected!");
    assert(receiptString.indexOf('cumulativeGasUsed') >= 0, "cumulativeGasUsed is not being returned and it's expected!");
    assert(receiptString.indexOf('gasUsed') >= 0, "gasUsed is not being returned and it's expected!");
    assert(receiptString.indexOf('contractAddress') >= 0, "contractAddress is not being returned and it's expected!");
    assert(receiptString.indexOf('logs') >= 0, "logs is not being returned and it's expected!");
    assert(receiptString.indexOf('from') >= 0, "from is not being returned and it's expected!");
    assert(receiptString.indexOf('to') >= 0, "to is not being returned and it's expected!");
    assert(receiptString.indexOf('root') >= 0, "root is not being returned and it's expected!");
    assert(receiptString.indexOf('status') >= 0, "status is not being returned and it's expected!");
    assert(receiptString.indexOf('logsBloom') >= 0, "logsBloom is not being returned and it's expected!");
    let invalidTx = await rsk3.getTransactionReceipt('0xd05274b72ca6346bcce89a64cd42ddd28d885fdd06772efe0fe7d19fdeadbeef');
    assert.isNull(invalidTx);
  });

  // eth_getStorageAt
  it(`eth_getStorageAt: Should get storage at a specific location`, async () => {
    let storageValue = await rsk3.getStorageAt(
      contractAddress,
      0,
      'latest'
    );

    assert.equal(storageValue, '0x0000000000000000000000000000000000000000000000000000000000000022');
  });

  // eth_getLogs
  it(`eth_getLogs: Should get the logs of a contract`, async () => {
    let logs = await rsk3.getPastLogs({
      'fromBlock': "0x0",
      'toBlock': await rsk3.getBlockNumber(),
      'address': contractAddress,
    });
    assert.isObject(logs[0]);
    let logTrxHash = logs[0].transactionHash;
    assert.equal(logTrxHash, trxHash);
    let logsString = JSON.stringify(logs[0]);
    assert(logsString.indexOf('logIndex') >= 0, "logIndex: is not being returned and it's expected!");
    assert(logsString.indexOf('blockNumber') >= 0, "blockNumber: is not being returned and it's expected!");
    assert(logsString.indexOf('blockHash') >= 0, "blockHash: is not being returned and it's expected!");
    assert(logsString.indexOf('transactionIndex') >= 0, "transactionIndex: is not being returned and it's expected!");
    assert(logsString.indexOf('address') >= 0, "address: is not being returned and it's expected!");
    assert(logsString.indexOf('data') >= 0, "data: is not being returned and it's expected!");
    assert(logsString.indexOf('topics') >= 0, "topics: is not being returned and it's expected!");
    assert(logsString.indexOf('id') >= 0, "id: is not being returned and it's expected!");
    assert(logsString.indexOf('transactionHash') >= 0, "transactionHash is not being returned and it's expected!");

  });


  //web3_sha3
  it(`web3_sha3: Should calculate sha3 for input`, async () => {
    let sha3Result = await rsk3.utils.sha3('234');
    assert.equal(sha3Result, '0xc1912fee45d61c87cc5ea59dae311904cd86b84fee17cc96966216f811ce6a79');
  });

  //eth_coinbase
  it(`eth_coinbase: Should return coinbase from RskJ`, async () => {
    let coinbase = await rsk3.getCoinbase();
    assert.equal(coinbase, '0xec4ddeb4380ad69b3e509baad9f158cdf4e4681d');
  });

});