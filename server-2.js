const express = require('express');
const app = express();
const ip = require('ip');
const ipAddress = ip.address();
const port = 8000;
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
        splitSymbol: 'BTC_USDT',    //used for balance/wallet/asset search, later on...
        //target %
        tgtPcnt: 1.2,               //ammount desired to gain
        buyLPcnt: 0.25,             //% of currentPrice subtracted for NEW and PARTIAL BUY orders! vs avgPrice or currentPrice
        //
        hghTriggPcnt: 1,            //trigger if i want to buy and price goes up %of order price vs currentPrice
        repUpPct: 0.025,            //% used to reprice order in loss_up condition vs currentPrice 'BUY' - currentPrice-X%
        //
        lowTriggPcnt: 1.8,          //trigger if i want to sell and price goes down  %of order price vs currentPrice
        repDwPct: 1,                //% used to reprice order in loss_down condition vs avgPrice 'SELL' +
        //decimals                  //
        stableDecimals: 1,          //
        tokenDecimals: 6,           //    
        //Qty                           
        defaultQty: 0.001,          //btc available for trading
        //Waits
        partialWait: 20,            //secs until recalc of partial order
        //Indicator limits
        stochBuyLimit: 30,          // They should be changed according to candle timeframe, now its 2h
        macdBuyLimit: -550,         // *   
        adxBuyLimit: 20,            // *
        aoBuyLimit: -1900,          // *
    }
];
//start bot in server
const binanceBot = new Bot(PAIRS, botEmitterCB, 10000); //last parameter is delay, it has a default value of 2secs if no delay is passed
binanceBot.startBot();
