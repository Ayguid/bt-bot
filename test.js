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
//placeOrder('ADAUSDT', 'BUY', 'LIMIT', {price: 0.5905, quantity: 100, timeInForce: 'GTC'});
//getOrder(keyPair, 10320852);
//cancelOrder('ADAUSDT', 3111752);
*/