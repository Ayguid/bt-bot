const express = require('express');
const app = express();
const ip = require('ip');
const ipAddress = ip.address();
const port = 7000;
//
const { Bot } = require('./scripts/bot-engine-2.js');
//
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
//callback for bot updates to interface through websocket
const botEmitterCB = async (msg, data = false) => {
    //console.log(msg);
    let account  = binanceBot.account;
    let pairs = binanceBot.pairs;
    if(msg == 'waiting'){
        await io.emit('WAITING'); 
    }
    if(msg == 'order placed'){
        await io.emit('ORDER_PLACED', data); 
    }
    await io.emit('ACCOUNT_MESSAGE', account);
    await io.emit('PAIRS_MESSAGE', pairs); 
}
//Pairs array for trading, add/edit pairs here.
let PAIRS = [
    {
        key: 'BTCUSDT',
        splitSymbol: 'BTC_USDT',//for balance search, later on...
        tgtPcnt: 1, 
        lowPcnt: 1.2, 
        hghPcnt: 1.2,
        // 
        stableDecimals: 1,
        tokenDecimals: 6,
        //
        defaultQty: 0.001,//btc available for trading
        //
        partialWait: 20,//secs until recalc of partial order
        //
        stochBuyLimit: 30,//
        macdBuyLimit: -190//190
    }
];
//start bot in server
const binanceBot = new Bot(PAIRS, botEmitterCB, 5000); //last parameter is delay, it has a defualt value of 2secs if no delay is passed
binanceBot.startBot();
