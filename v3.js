//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
//HELPERS
const {percent, roundDown} = require('./helpers.js');
const {saveData} = require('./fileManager.js');
//BINANCE CONNECTOR
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail} = require('./binance-spot.js');

//GLOBAL VARS START
let ACCOUNT = {};
let TRADES = {};
let PAIRS = { // add pairs here,
    BTCUSDT: { offset: false, margin: 0.15, symbol_sell: 'BTC', symbol_buy: 'USDT', min_buy: 50, min_sell: 0.003, decimals: 4, dollar_margin: 100}, 
    //ETHUSDT: {}
};
let EXIT_MAIN_LOOP = false; // used for exit condition to stop mainLoop function


const DELAY = 2000; //ms, dont go under 1500
const mainLoop = async ()=>{
    let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
    ACCOUNT = await fetchMyAccount();
    Object.keys(PAIRS).forEach((keyPair) => {
        promiseArray.push(new Promise(async (resolve, reject) => {
            PAIRS[keyPair].currentPrice = await tickerPrice(keyPair);
            PAIRS[keyPair].avgPrice = await avgPrice(keyPair);
            PAIRS[keyPair].margin_percent = percent(PAIRS[keyPair].margin, PAIRS[keyPair].avgPrice.price);
            if(!PAIRS[keyPair].offset){
                PAIRS[keyPair].offset = PAIRS[keyPair].currentPrice.price - percent(PAIRS[keyPair].margin, PAIRS[keyPair].currentPrice.price);
            }
            PAIRS[keyPair].orders = await fetchMyOrders(keyPair);
            //            
            PAIRS[keyPair].last_order = PAIRS[keyPair].orders.length > 0 ? PAIRS[keyPair].orders.sort((a,b)=>{ 
                return new Date(b.time) - new Date(a.time);
            })[0] : false;
            //
            let slipage_ratio = roundDown(PAIRS[keyPair].currentPrice.price / PAIRS[keyPair].offset, PAIRS[keyPair].decimals);
            let zone = slipage_ratio < 1 ? 'BELOW' : 'ABOVE'; 
            //
            if (slipage_ratio > 1 +  (PAIRS[keyPair].margin/100)) {// redifine offset
                PAIRS[keyPair].offset = PAIRS[keyPair].currentPrice.price * (1 - ( PAIRS[keyPair].margin /100)), 0;
                console.log('REDIFINE OFFSET ABOVE');
            }else if(slipage_ratio < 1 -  (PAIRS[keyPair].margin/100)){
                PAIRS[keyPair].offset = PAIRS[keyPair].currentPrice.price * (1 + ( PAIRS[keyPair].margin /100)), 0;
                console.log('REDIFINE OFFSET BELOW');
            }
            //

            //
            if(ACCOUNT?.balances){
                let buy_balance = ACCOUNT?.balances.find(obje => obje.asset == PAIRS[keyPair].symbol_buy).free;
                let sell_balance = ACCOUNT?.balances.find(obje => obje.asset == PAIRS[keyPair].symbol_sell).free;
                if(zone == 'ABOVE'){// generate orders
                    if (buy_balance > PAIRS[keyPair].min_buy){
                        //create order with all your usdt to buy BTC or current key
                        let qty = roundDown(buy_balance / (PAIRS[keyPair].currentPrice.price + PAIRS[keyPair].dollar_margin), PAIRS[keyPair].decimals);
                        let price =  roundDown(PAIRS[keyPair].currentPrice.price + PAIRS[keyPair].dollar_margin);
                        let order = await placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: price, quantity: qty, timeInForce: 'GTC'});
                        console.log('BUY ORDER...', order);
                    }
                } else if(zone == 'BELOW'){
                    if (sell_balance > PAIRS[keyPair].min_sell){
                        let qty = sell_balance;
                        let price =  roundDown(PAIRS[keyPair].currentPrice.price - PAIRS[keyPair].dollar_margin, PAIRS[keyPair].decimals);
                        let order = await placeOrder('BTCUSDT', 'SELL', 'LIMIT', {price: price, quantity: qty, timeInForce: 'GTC'});
                        console.log('SELL ORDER...', order);
                    }
                }
                console.log(keyPair, zone, slipage_ratio, PAIRS[keyPair].symbol_buy, buy_balance, PAIRS[keyPair].symbol_sell, sell_balance, PAIRS[keyPair].offset, PAIRS[keyPair].currentPrice.price);
            }
            //
            resolve();
        }));
    });
    //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
    Promise.all(promiseArray).then(() => {
        saveData(ACCOUNT, 'account.json'); // only if x condition save data
        saveData(PAIRS, 'pairs.json'); // only if x condition save data
        if(!EXIT_MAIN_LOOP) setTimeout(mainLoop, DELAY); //loops
    }).catch(error => {
        console.log(error); 
        //mainLoop;
    });
    /*
    // let tt = await assetDetail('BTC'); doesnt work on testnet
    if(!EXIT_MAIN_LOOP) setTimeout(mainLoop, delay); //loops
    */
};


console.log('Starting');
mainLoop();

//cancelOrder('BTCUSDT', 12213042);
//let order = placeOrder('BTCUSDT', 'SELL', 'LIMIT', {price: 64000, quantity: 0.1, timeInForce: 'GTC'});
//console.log(order);