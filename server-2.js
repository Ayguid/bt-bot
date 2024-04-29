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
//botEmitterCB for bot updates
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
//start bot in server
let PAIRS = [// add pairs here,
    {
        key: 'BTCUSDT',
        splitSymbol: 'BTC_USDT',//for balance search later on
        tgtPcnt: 1, 
        lowPcnt: 1.2, 
        hghPcnt: 1.2,
        // 
        stableDecimals: 1,
        tokenDecimals: 6,
        //
        defaultQty: 0.001,//btc available for trading
        //
        partialWait: 20,//secs to wait until recalc of partial order
        //
        stochBuyLimit: 30,//
        macdBuyLimit: -190//190
    },
    //{ key: 'BTCUSDT', splitSymbol: 'BTC_USDT', tgtPcnt: 0.5, lowPcnt: 1.2, hghPcnt: 1, decimals: 2, defaultQty: 0.0015},
    //{ key: 'BTCUSDT', splitSymbol: 'BTC_USDT', tgtPcnt: 0.7, lowPcnt: 1.5, hghPcnt: 1.2, decimals: 2, defaultQty: 0.1},
];
const binanceBot = new Bot(PAIRS, botEmitterCB, 5000); //last parameter is delay, it has a defualt value of 1sec if no delay is passed
binanceBot.startBot();
