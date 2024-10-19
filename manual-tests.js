require('dotenv').config(); // Environment variables
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail, klines} = require('./scripts/binance-spot-2.js');


//cancelOrder('BTCUSDT', 8571283);

//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 62260.76, quantity: 0.0015, timeInForce: 'GTC'});

/*
placeOrder('ADAUSDC', 'BUY', 'LIMIT', {price: 0.5193, quantity: 100, timeInForce: 'GTC'});
//getOrder(keyPair, 10320852);
//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 66000, quantity: 0.1, timeInForce: 'GTC'});
//cancelOrder('BTCUSDT', 4228567);
*/
//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 66129, quantity: 0.1, timeInForce: 'GTC'});


//cancelOrder('BTCUSDT', 7066174);
//placeOrder('BTCUSDT', 'SELL', 'LIMIT', {price: 63056, quantity: 0.1, timeInForce: 'GTC'});
