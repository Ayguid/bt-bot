const express = require('express');
const app = express();
const ip = require('ip');
const ipAddress = ip.address();
const port = 3000;

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
});

//emitterCallback for bot updates
const emitterCallback = async (msg) => {
    //console.log(msg);
    let account  = binanceBot.account;
    let pairs = binanceBot.pairs;
    await saveData(account, 'account.json'); // only if x condition save data
    await saveData(pairs, 'pairs.json'); // only if x condition save data
    if(msg == 'waiting'){
        await io.emit('WAITING'); 
    }
    await io.emit('ACCOUNT_MESSAGE', account);
    await io.emit('PAIRS_MESSAGE', pairs); 
    //binanceBot.stopBot();
}

//start bot in server
let ACCOUNT = {}; //empty for now, not necesary bot bot constructor ,, but,,,,
let PAIRS = { // add pairs here,
    BTCUSDT: { splitSymbol: 'BTC_USDT', tgtPcnt: 1, stpPcnt: 2.5, decimals: 4},
};
const binanceBot = new Bot(ACCOUNT, PAIRS, emitterCallback);
binanceBot.startBotLoop(io.emit);
