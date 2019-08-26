const assert = require('chai').assert;
const Web3 = require('web3');
const BN = require('bignumber.js');
const fs = require('fs');
const path = require('path');


describe('RskJ Smoke Tests', function () {
  this.timeout(10000);
  let web3;
  //let web3Full1;

  let PRIVATE_KEY = '0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4'; //cow

  let testAccount = '0x0000000000000000000000000000000001000006';
  let contractAddress = '';
  let trxHash = '';


  before(async () => {
    web3 = new Web3('http://127.0.0.1:4444', null, { transactionConfirmationBlocks: 1 });

    web3.evm = {
      mine: () => web3.currentProvider.send('evm_mine')
    };
  });


  it('Should advance until block 5', async () => {
    let blockNumber = await web3.eth.getBlockNumber();
    for (let i = blockNumber; i < 5; i++) {
      await web3.evm.mine();
    }
    blockNumber = await web3.eth.getBlockNumber();
    assert.isAbove(blockNumber, 4);
  })

  it('Should have all the simple cached methods work', async () => {
    // web3_clientVersion
     //let clientVersion = await web3Full1.eth.getNodeInfo();
     //assert(clientVersion.indexOf('RskJ') >= 0);

    // eth_hashrate
    let hashRate = await web3.eth.getHashrate();
    assert.equal(hashRate, '0');

    // eth_syncing
    let isSyncing = await web3.eth.isSyncing();
    if (typeof isSyncing === 'object') {
      assert.containsAllKeys(isSyncing, ['currentBlock', 'highestBlock', 'startingBlock']);
      assert.isAbove(isSyncing.currentBlock, 0);
      assert.isAbove(isSyncing.highestBlock, 0);
      assert.isAbove(isSyncing.startingBlock, 0);
    } else {
      assert.equal(isSyncing, false);
    }

    // net_listening
    let isListening = await web3.eth.net.isListening();
    assert(isListening);

    // net_peerCount
    let peerCount = await web3.eth.net.getPeerCount();
    assert.isAbove(peerCount, -1);


    // net_version
    let networkId = await web3.eth.net.getId();
    assert.equal(networkId, 33);

    // eth_accounts
    let accounts = await web3.eth.getAccounts();
    assert.isArray(accounts);

    // eth_protocolVersion
    let protocolVersion = await web3.eth.getProtocolVersion();
    assert.equal(protocolVersion, '62');

    
    // eth_getCompilers -Not available
    //let compilers = await web3.eth.getCompilers();
    //assert.isArray(compilers);
    //assert.equal(compilers.length, 1);

    // eth_mining
    let isMining = await web3.eth.isMining();
    assert.equal(isMining, true);

  });

  // eth_blockNumber
  it('eth_blockNumber: Should get the current block number', async () => {
    let blockNumber = await web3.eth.getBlockNumber();
    assert.isAbove(blockNumber, 4);
  });

  // eth_gasPrice
  it('eth_gasPrice: Should get the gas price', async () => {
    let gasPrice = new BN(await web3.eth.getGasPrice());
    assert.equal(gasPrice.toNumber(), '0');
  });

  // eth_getTransactionCount
  it('eth_getTransactionCount: Should get an accounts transaction count', async () => {
    let transactionCount = await web3.eth.getTransactionCount(
      testAccount,
      'latest'
    );
    assert.equal(transactionCount, '0');
  });

  // eth_getBalance
  it('eth_getBalance: Should get a the right balance for an account', async () => {
    let balance = new BN(await web3.eth.getBalance(
      testAccount,
      'latest'
    ));
    assert.equal(balance.toNumber(), '21000000000000000000000000');

    let historicBalance = new BN(await web3.eth.getBalance(
      testAccount,
      0
    ));
    let expectedHistoricBalance = new BN(21000000000000000000000000);
    assert.equal(historicBalance.minus(expectedHistoricBalance).toNumber(), 0);

    let unusedAccountBalance = new BN(await web3.eth.getBalance(
      '0x09a1eda29f664ac8f68106f6567276df0c65d859',
      'latest'
    ));
    assert.equal(unusedAccountBalance.toNumber(), '1000000000000000000000000000000');
  });

  // eth_getTransactionByBlockHashAndIndex
  // eth_getTransactionByBlockNumberAndIndex
  it('eth_getTransactionByBlockHashAndIndex-eth_getTransactionByBlockNumberAndIndex: Should get transactions by block number and hash', async () => {
    let blockNumber = 1;
    let byBlockNumber = await web3.eth.getTransactionFromBlock(blockNumber, 0);
    let blockHash = byBlockNumber.blockHash;
    let byHash = await web3.eth.getTransactionFromBlock(blockHash, 0);

    assert.deepEqual(byBlockNumber, byHash);

    let invalidBlock = await web3.eth.getTransactionFromBlock('0xdeadbeef0fb9424aad2417321cac62915f6c83827f4d3c8c8c06900a61c4236c', 0);
    assert.isNull(invalidBlock);
  });

  // eth_getBlockTransactionCountByHash
  // eth_getBlockTransactionCountByNumber
  it(`eth_getBlockTransactionCountByHash-eth_getBlockTransactionCountByNumber: Should return the right number of block transactions`, async () => {
    let expectedCount = 1;
    let blockNumber = 4;
    let byBlockNumber = await web3.eth.getTransactionFromBlock(blockNumber, 0);
    let blockHash = byBlockNumber.blockHash;

    let byHash = await web3.eth.getBlockTransactionCount(blockHash);
    assert.equal(byHash, expectedCount);

    let byNumber = await web3.eth.getBlockTransactionCount(blockNumber);
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
    let contract = new web3.eth.Contract(abi);
    let signedAccount = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    let deployment = contract.deploy({ data: '0x6080604052600560005534801561001557600080fd5b5060ff806100246000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780636d4ce63c146062575b600080fd5b606060048036036020811015604b57600080fd5b8101908080359060200190929190505050607e565b005b606860c1565b6040518082815260200191505060405180910390f35b806000819055507f93fe6d397c74fdf1402a8b72e47b68512f0510d7b98a4bc4cbdf6ac7108b3c596000546040518082815260200191505060405180910390a150565b6000805490509056fea265627a7a72305820c73a787ed29a46f8a85631abd07c906d900ca03c03b631cc85fe396408072ee164736f6c634300050a0032', arguments: [] });

    let contractData = deployment.encodeABI();

    let transaction = {
      value: 0,
      gasPrice: web3.utils.toHex(10000000),
      gas: web3.utils.toHex(1000000),
      data: contractData,
      chainId: 33
    };

    let signedTx = await signedAccount.signTransaction(transaction);
    let txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    assert(txReceipt.contractAddress);
    contractAddress = txReceipt.contractAddress;

    let deployedContract = new web3.eth.Contract(abi, txReceipt.contractAddress);

    let getCall = deployedContract.methods.get();
    let callParams = {
      to: txReceipt.contractAddress,
      data: getCall.encodeABI(),
    };

    let currentVal = await web3.eth.call(callParams);
    assert.equal(currentVal, '0x0000000000000000000000000000000000000000000000000000000000000005');

    let currentValLatest = await web3.eth.call(callParams,"latest");
    assert.equal(currentValLatest, '0x0000000000000000000000000000000000000000000000000000000000000005');
   
    let currentValPending = await web3.eth.call(callParams,"pending");
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
    let receipt = await web3.eth.sendSignedTransaction(setSignedTx.rawTransaction)
      .once('transactionHash', (hash) => {
        assert.isString(hash);
        trxHash = hash;
      })
      .on('error', (error) => {
        assert(false, `Unexpected error sending set transaction: $`);
      });

    assert.isObject(receipt);

    await new Promise((res) => setTimeout(res, 5000));

    await deployedContract.getPastEvents('ValueChanged', { fromBlock: 0, toBlock: 'latest' }, (error, eventLogs) => {
      assert(!error, `Unexpected error reading logs ${error}`);
      assert.equal(eventLogs[0].returnValues.newValue, "34");
    });
  });

  // eth_getCode
  it(`eth_getCode: Should return the contract's code`, async () => {
    let contractCode = await web3.eth.getCode(contractAddress, 'latest');
    assert(contractCode);

    let accountCount = await web3.eth.getCode(testAccount,'earliest');
    assert.equal('0x00', accountCount);

    let invalidAccount = await web3.eth.getCode('0x0000000000000000000000000000000000000001', 'latest');
    assert.equal('0x00', invalidAccount);
  });

  // eth_getBlockByHash
  // eth_getBlockByNumber
  it(`eth_getBlockByHash-eth_getBlockByNumber: Should get the block by hash and number`, async () => {
    this.timeout(20000);
    let blockNumber = '2';
    let byNumber = await web3.eth.getBlock(blockNumber);
    let blockHash = byNumber.hash;
    let byHash = await web3.eth.getBlock(blockHash);

    assert.deepEqual(byHash, byNumber);

    let withTransactions = await web3.eth.getBlock(blockHash, true);
    assert.equal(withTransactions.transactions.length, 1);
    assert.isObject(withTransactions.transactions[0]);
  });

  // eth_getTransactionByHash
  it(`eth_getTransactionByHash: Should get a transaction by its hash`, async () => {
    let tx = await web3.eth.getTransaction(trxHash);
    assert(tx);

    let invalidTx = await web3.eth.getTransaction('0x5eae996aa609c0b9db434c7a2411437fefc3ff16046b71ad102453cfdeadbeef');
    assert.isNull(invalidTx);
  });

  // eth_getTransactionReceipt
  it(`eth_getTransactionReceipt: Should get transaction receipt`, async () => {

    let receipt = await web3.eth.getTransactionReceipt(trxHash);
    assert(receipt);

    let invalidTx = await web3.eth.getTransactionReceipt('0xd05274b72ca6346bcce89a64cd42ddd28d885fdd06772efe0fe7d19fdeadbeef');
    assert.isNull(invalidTx);
  });

  // eth_getStorageAt
  it(`eth_getStorageAt: Should get storage at a specific location`, async () => {
    let storageValue = await web3.eth.getStorageAt(
      contractAddress,
      0,
      'latest'
    );

    assert.equal(storageValue, '0x0000000000000000000000000000000000000000000000000000000000000022');
  });

  // eth_getLogs
  it(`eth_getLogs: Should get the logs of a contract`, async () => {
    let logs = await web3.eth.getPastLogs({
      'fromBlock': "0x0",
      'toBlock': await web3.eth.getBlockNumber(),
      'address': contractAddress,
    });
    assert(logs);
  });


  //web3_sha3
  it(`web3_sha3: Should calculate sha3 for input`, async () =>{
    let sha3Result = await web3.utils.sha3('234'); 
    assert.equal(sha3Result, '0xc1912fee45d61c87cc5ea59dae311904cd86b84fee17cc96966216f811ce6a79');
  });
  
  //eth_coinbase
  it(`eth_coinbase: Should return coinbase from RskJ`, async () =>{
    let coinbase = await web3.eth.getCoinbase(); 
    assert.equal(coinbase, '0xec4ddeb4380ad69b3e509baad9f158cdf4e4681d');
  });

});