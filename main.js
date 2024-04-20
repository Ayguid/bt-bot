//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
//HELPERS
const {percent} = require('./helpers.js');
const {saveData} = require('./fileManager.js');
//BINANCE CONNECTOR
const { fetchMyAccount, avgPrice,  fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder} = require('./binance-spot.js');

//GLOBAL VARS START
let EXIT_MAIN_LOOP = false; // used for exit condition to stop mainLoop function
//let TEST_REQ_QTY = 0; //counter used to exit after x times
//let TEST_REQ_LIMIT = 3; //limit used to exit after x times
//
let ACCOUNT = {};
let TRADES = {};
let ORDERS = { // add pairs here,
    ADAUSDT: { tgtPcnt: 1.5, stpPcnt: 3.5}, 
    //ETHUSDT: {}
};
let LAST_ORDER = {};
//GLOBAL VARS END


/* MAIN BOT LOOP */
const mainLoop = async ()=> {
    const delay = 4000; //ms, dont go under 2000
    let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
    //ACCOUNT = await fetchMyAccount();
    //
    Object.keys(ORDERS).forEach((keyPair) => {
        promiseArray.push(new Promise(async (resolve, reject) => {
            //console.log(keyPair);
            ORDERS[keyPair].avgPrice = await avgPrice(keyPair);
            ORDERS[keyPair].orders = await fetchMyOrders(keyPair);
            //get last order && sort by time,,, not sure
            LAST_ORDER = ORDERS[keyPair].orders.length > 0 ? ORDERS[keyPair].orders.sort((a,b)=>{ 
                return new Date(b.time) - new Date(a.time);
            })[0] : false;
            //
            if(LAST_ORDER){ 
                //console.log(LAST_ORDER.symbol, LAST_ORDER.side, LAST_ORDER.status, LAST_ORDER.origQty, LAST_ORDER.price);
                if(LAST_ORDER.status == 'NEW') {
                    //order is pending/new
                    console.log('WAITING FOR ORDER TO BE FILLED');
                    //check to see if price is below loss percent, if it is, cancel last order and create sell oder.
                    if(ORDERS[keyPair].avgPrice < LAST_ORDER.price - percent(ORDERS[keyPair].stpPcnt, LAST_ORDER.price)){
                        console.log('PRICE HAS FALLEN BY SELLING AND REBUYING');
                        console.log(LAST_ORDER.price - percent(ORDERS[keyPair].stpPcnt, LAST_ORDER.price));
                        await cancelOrder(keyPair, LAST_ORDER.id);
                        LAST_ORDER = await placeOrder(keyPair, 'BUY', 'LIMIT', 
                        { price: (ORDERS[keyPair].avgPrice - percent(ORDERS[keyPair].tgtPcnt, ORDERS[keyPair].avgPrice)).toFixed(4), 
                          quantity: 100, 
                          timeInForce: 'GTC'
                        });
                        //console.log(ORDERS[keyPair].avgPrice <= LAST_ORDER.price - percent(ORDERS[keyPair].tgtPcnt, LAST_ORDER.price));
                    }
                }
                else if(LAST_ORDER.status == 'CANCELED') {
                    //order was canceled
                    console.log('CREATE NEW ORDER?');
                }
                else if(LAST_ORDER.status == 'FILLED') {
                    //order was filled & create new order
                    console.log('ORDER FILLED WAS ', LAST_ORDER.side);
                    let type = '';
                    let price = 0;
                    let qty = 100;
                    if (LAST_ORDER.side == 'BUY'){
                        type = 'SELL';
                        price = (ORDERS[keyPair].avgPrice + percent(ORDERS[keyPair].tgtPcnt, ORDERS[keyPair].avgPrice)).toFixed(4);
                    }else if(LAST_ORDER.side == 'SELL') {
                        type = 'BUY';
                        price = (ORDERS[keyPair].avgPrice - percent(ORDERS[keyPair].tgtPcnt, ORDERS[keyPair].avgPrice)).toFixed(4);
                    }
                    let order = await placeOrder(keyPair, type, 'LIMIT', {
                        price: price, 
                        quantity: qty, 
                        timeInForce: 'GTC'
                    });
                    LAST_ORDER = order;
                    //await saveData(order, 'LAST_ORDER.json'); //only when new order created
                    //console.log('ORDER FILLED WAS/BUY', order.side);
                }
                await saveData(LAST_ORDER, 'last_order.json'); //always resaves last order
                //
            }
            else {//Only for first start,
                console.log('NO ORDERS, CREATE NEW STARTING ORDER FOR PAIR');
                /*
                    Place order using avgPrice manually, for now,,,
                */
            }
            //TRADES[keyPair] = await fetchMyTrades(keyPair);
            //console.log(`${ORDERS[keyPair].tgtPcnt}% of ${ORDERS[keyPair].avgPrice} is: ${percent(ORDERS[keyPair].tgtPcnt, ORDERS[keyPair].avgPrice)}`);
            resolve();
        }));
    });
    //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
    Promise.all(promiseArray).then(() => {
        //saveData(ACCOUNT, 'account.json'); // only if x condition save data
        saveData(ORDERS, 'orders.json'); // only if x condition save data
        //saveData(TRADES, 'trades.json'); // only if x condition save data
        //TEST_REQ_QTY++;
        //console.log(test_req_qty);
        //if (TEST_REQ_QTY >= TEST_REQ_LIMIT){ EXIT_MAIN_LOOP = true; TEST_REQ_QTY = 0;} // x condition for exit, testing
        if(!EXIT_MAIN_LOOP) setTimeout(mainLoop, delay); //loops
    }).catch(error => {
        console.log(error); 
        //mainLoop;
    });
    //
}

//START PROGRAM
console.log('Starting Bot');
mainLoop();
//placeOrder('ADAUSDT', 'BUY', 'LIMIT', {price: 0.5905, quantity: 100, timeInForce: 'GTC'});
//getOrder(keyPair, 10320852);
//cancelOrder('ADAUSDT', 3111752);


/* chekc internet connect heade style
    require('dns').resolve('www.google.com', function(err) {
        if (err) {
           console.log("No connection");
        } else {
           console.log("Connected");
        }
      });
*/
