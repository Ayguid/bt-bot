
//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
//server interface
require('./scripts/interface-server.js');
//HELPERS
const {percent} = require('./scripts/helpers.js');
const {saveData} = require('./scripts/fileManager.js');
//BINANCE CONNECTOR
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder} = require('./scripts/binance-spot.js');
const { Table  } = require('console-table-printer');
//GLOBAL VARS START
let EXIT_MAIN_LOOP = false; // used for exit condition to stop mainLoop function
//let TEST_REQ_QTY = 0; //counter used to exit after x times
//let TEST_REQ_LIMIT = 3; //limit used to exit after x times
//
let ACCOUNT = {};
let TRADES = {};
let PAIRS = { // add pairs here,
    ADAUSDC: { tgtPcnt: 1.5, stpPcnt: 2.5}, 
};
//GLOBAL VARS END


/* MAIN BOT LOOP */
const mainLoop = async ()=> {
    const delay = 4000; //ms, dont go under 2000
    let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
    ACCOUNT = await fetchMyAccount();
    //
    Object.keys(PAIRS).forEach((keyPair) => {
        promiseArray.push(new Promise(async (resolve, reject) => {
            //console.log(keyPair);
            PAIRS[keyPair].currentPrice = await tickerPrice(keyPair);
            PAIRS[keyPair].avgPrice = await avgPrice(keyPair);
            PAIRS[keyPair].orders = await fetchMyOrders(keyPair);
            //get last order && sort by time,,, not sure if this is the right way to get the last order for that pair
            PAIRS[keyPair].last_order = PAIRS[keyPair].orders.length > 0 ? PAIRS[keyPair].orders.sort((a,b)=>{ 
                return new Date(b.time) - new Date(a.time);
            })[0] : false;
            //
            if(PAIRS[keyPair].last_order){ // esentially if an order exists for that pair 
                /*
                let last_order_status = PAIRS[keyPair].last_order.status;
                let last_order_side = PAIRS[keyPair].last_order.side;
                let exec_qty = PAIRS[keyPair].last_order.executedQty;
                let last_order_price = PAIRS[keyPair].last_order.price;
                */
                let {status, side, executedQty, price} = PAIRS[keyPair].last_order
                //print able
                console.log('\x1b[33m%s\x1b[0m','\nLAST ORDER FOR PAIR:', keyPair);
                const p = new Table({
                    columns: [
                        { name: 'symbol', alignment: 'left', color: 'blue' }, // with alignment and color
                        { name: 'status', title: 'Order stauts', color: 'red'}, // with Title as separate Text
                        { name: 'side', title: 'Side', alignment: 'right', color: 'custom_green' },
                        { name: 'exec_qty', title: 'Exec Qty', alignment: 'right', color: 'custom_green' },
                        { name: 'price', title: 'Price', alignment: 'right', color: 'custom_green' },
                    ],
                    colorMap: {
                        custom_green: '\x1b[32m', // define customized color
                    },
                    rows: [
                        { symbol: keyPair, status: status, side: side, exec_qty: executedQty, price: price},
                    ],
                });
                p.printTable();
                //   
                if(status == 'NEW') {
                    //order is pending/new
                    console.log('WAITING FOR ORDER TO BE FILLED');
                    //check to see if price is below loss percent, if it is, cancel last order and create sell oder.
                    if(PAIRS[keyPair].avgPrice.price < PAIRS[keyPair].last_order.price - percent(PAIRS[keyPair].stpPcnt, PAIRS[keyPair].last_order.price)){
                        //console.log('PRICE HAS FALLEN BY SELLING AND REBUYING');
                        //console.log(ORDERS[keyPair].avgPrice <= LAST_ORDER.price - percent(ORDERS[keyPair].tgtPcnt, LAST_ORDER.price));
                    }
                }
                else if(status == 'CANCELED') {
                    //order was canceled
                    console.log('CREATE NEW ORDER?');
                }
                else if(status == 'FILLED') {
                    //order was filled & create new order
                    //console.log('ORDER FILLED WAS ', '\x1b[36m',last_order_side,'\x1b[0m');
                    let type = '';
                    let price = 0;
                    //let qty = 100;
                    if (side == 'BUY'){
                        type = 'SELL';
                        //price = (PAIRS[keyPair].avgPrice.price + percent(PAIRS[keyPair].tgtPcnt, PAIRS[keyPair].avgPrice.price)).toFixed(4);
                    }else if(side == 'SELL') {
                        type = 'BUY';
                        //price = (PAIRS[keyPair].avgPrice.price - percent(PAIRS[keyPair].tgtPcnt, PAIRS[keyPair].avgPrice.price)).toFixed(4);
                    }
                    //await saveData(order, 'LAST_ORDER.json'); //only when new order created
                    //console.log('ORDER FILLED WAS/BUY', order.side);
                }
                console.log('Checking last order END');
                //await saveData(LAST_ORDER, 'last_order.json'); //always resaves last order
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
        saveData(ACCOUNT, 'account.json'); // only if x condition save data
        saveData(PAIRS, 'pairs.json'); // only if x condition save data
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

//module.exports = { ACCOUNT, PAIRS};

//START PROGRAM
console.log('Starting Bot');
mainLoop();




//placeOrder('ADAUSDC', 'BUY', 'LIMIT', {price: 0.50100000, quantity: 1000, timeInForce: 'GTC'});
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
