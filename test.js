//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
//HELPERS
const {percent} = require('./helpers.js');
const {saveData} = require('./fileManager.js');
//BINANCE CONNECTOR
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail} = require('./binance-spot.js');

async function test(){
    let x = await fetchMyAccount()
    console.log(x)
}

test()