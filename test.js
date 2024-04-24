//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
//HELPERS
const {percent} = require('./scripts/helpers.js');
const {saveData} = require('./scripts/fileManager.js');
//BINANCE CONNECTOR
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail} = require('./scripts/binance-spot.js');

async function test(){
    let x = await fetchMyAccount()
    console.log(x)
}

//test()
/*
placeOrder('ADAUSDC', 'BUY', 'LIMIT', {price: 0.5193, quantity: 100, timeInForce: 'GTC'});
//getOrder(keyPair, 10320852);
//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 66000, quantity: 0.1, timeInForce: 'GTC'});
//cancelOrder('BTCUSDT', 4228567);
*/
//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 66129, quantity: 0.1, timeInForce: 'GTC'});
//cancelOrder('ETHUSDC', 1560200);

placeOrder('BNBUSDC', 'BUY', 'LIMIT', {price: 600, quantity: 1, timeInForce: 'GTC'});