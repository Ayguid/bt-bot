const express = require('express');
const app = express();
const ip = require('ip');
const ipAddress = ip.address();
const port = 5000;

const { Bot } = require('./bot-engine.js');
const { saveData } = require('./fileManager.js');

const server = app.listen(port, function() {
    console.log('server running on port', port);
    console.log(`Network access via: ${ipAddress}:${port}!`);
});

const io = require('socket.io')(server, {
    cors: {
      origin: '*'
    }
});

//
io.on('connection', function(socket) {
    console.log('Client connected', socket.id)
    socket.on('start bot', function() {
        binanceBot.startBot();
    });
    socket.on('stop bot', function() {
        binanceBot.stopBot();
    });
});


//botEmitterCB for bot updates
const botEmitterCB = async (msg, data = false) => {
    //console.log(msg);
    let account  = binanceBot.account;
    let pairs = binanceBot.pairs;
    await saveData(account, 'account.json'); // only if x condition save data
    await saveData(pairs, 'pairs.json'); // only if x condition save data
    if(msg == 'waiting'){
        await io.emit('WAITING'); 
    }
    if(msg == 'order placed'){
        await io.emit('ORDER_PLACED', data); 
    }
    await io.emit('ACCOUNT_MESSAGE', account);
    await io.emit('PAIRS_MESSAGE', pairs); 
    //binanceBot.stopBot();
}

//start bot in server
let ACCOUNT = {}; //empty for now, not necesary bot bot constructor ,, but,,,,
let PAIRS = [// add pairs here,
    { key: 'BTCUSDT', splitSymbol: 'BTC_USDT', tgtPcnt: 0.7, lowPcnt: 1.5, hghPcnt: 1.2, decimals: 2, defaultQty: 0.1},
    //{ key: 'BTCUSDT', splitSymbol: 'BTC_USDT', tgtPcnt: 0.7, stpPcnt: 2.5, hghPcnt: 1.2, decimals: 2, defaultQty: 0.1},
    //{ key: 'ADAUSDC', splitSymbol: 'ADA_USDC', tgtPcnt: 1, stpPcnt: 2.5, hghPcnt: 1.2, decimals: 4, defaultQty: 100}
    //{ key: 'BNBUSDC', splitSymbol: 'BNB_USDC', tgtPcnt: 1, stpPcnt: 2.5, hghPcnt: 1.2, decimals: 1, defaultQty: 1}
];
const binanceBot = new Bot(ACCOUNT, PAIRS, botEmitterCB, 3000); //last parameter is delay, it has a defualt value of 1sec if no delay is passed
binanceBot.startBot();
