//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
//HELPERS
const {percent} = require('./helpers.js');
const {saveData} = require('./fileManager.js');
//BINANCE CONNECTOR
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail} = require('./binance-spot.js');

//GLOBAL VARS START
let ACCOUNT = {};
let TRADES = {};
let PAIRS = { // add pairs here,
    BTCUSDT: { tgtPrc: 58000, sllMgn: 0.01, buyMgn: 0.01}, 
    //ETHUSDT: {}
};
let LAST_ORDER = {};
let EXIT_MAIN_LOOP = false; // used for exit condition to stop mainLoop function


const DELAY = 1500; //ms, dont go under 1500
const mainLoop = async ()=>{
    let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
    ACCOUNT = await fetchMyAccount();
    Object.keys(PAIRS).forEach((keyPair) => {
        promiseArray.push(new Promise(async (resolve, reject) => {
            let qty = 0.05
            PAIRS[keyPair].currentPrice = await tickerPrice(PAIRS[keyPair]);
            PAIRS[keyPair].avgPrice = await avgPrice(keyPair);
            PAIRS[keyPair].orders = await fetchMyOrders(keyPair);
            //
            LAST_ORDER[keyPair] = PAIRS[keyPair].orders.length > 0 ? PAIRS[keyPair].orders.sort((a,b)=>{ 
                return new Date(b.time) - new Date(a.time);
            })[0] : false;

            //
            let above_or_below_target = (PAIRS[keyPair].currentPrice.price / PAIRS[keyPair].tgtPrc) < 1 ? 'BELOW' : 'ABOVE';
            PAIRS[keyPair].tgtPrc = (PAIRS[keyPair].currentPrice.price  / (1 + PAIRS[keyPair].sllMgn)).toFixed(2);
            if(above_or_below_target == 'ABOVE'){
                up_low_limit = PAIRS[keyPair].currentPrice.price / (PAIRS[keyPair].tgtPrc * (1 + PAIRS[keyPair].sllMgn)); 
                if(up_low_limit > 1){
                    PAIRS[keyPair].tgtPrc = (PAIRS[keyPair].currentPrice.price  / (1 + PAIRS[keyPair].sllMgn)).toFixed(2);
                }
            } else if(above_or_below_target == 'BELOW'){
                up_low_limit = PAIRS[keyPair].currentPrice.price / (PAIRS[keyPair].tgtPrc * (1 - PAIRS[keyPair].buyMgn));
                if(up_low_limit < 1){
                    PAIRS[keyPair].tgtPrc = (PAIRS[keyPair].currentPrice.price  / (1 - PAIRS[keyPair].buyMgn)).toFixed(2);
                }
            }
            //console.log(PAIRS[keyPair].tgtPrc);
            //if(BUY) else SELL
            switch (LAST_ORDER[keyPair].status) {
                case 'CANCELED':
                    //asdasd
                    break;
            
                case 'FILLED':
                    //asdasdas
                    break;
            
                case 'NEW':
                    //asdasds
                    break;
            
                default:
                    break;
            }
            //
            //console.log(up_low_limit);

            //console.log(PAIRS[keyPair].currentPrice);
            resolve();
        }));
    });
    //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
    Promise.all(promiseArray).then(() => {
        saveData(ACCOUNT, 'account.json'); // only if x condition save data
        saveData(PAIRS, 'pairs.json'); // only if x condition save data
        saveData(LAST_ORDER, 'last_order.json'); // only if x condition save data
        //saveData(TRADES, 'trades.json'); // only if x condition save data
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
//let order = placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 58000, quantity: 0.01, timeInForce: 'GTC'});
//console.log(order);