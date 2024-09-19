//LIBS 
//const EventEmitter = require('node:events');
//KEYS AND URL
require('dotenv').config(); // env config
// BINANCE CONECTOR
const TESTNET = false;//process.env.BINANCE_API_SECRET_TEST || '';
const { Spot } = require('@binance/connector'); //https://github.com/binance/binance-connector-node/
let apiKey , apiSecret, client;
if(TESTNET){
    const TEST_URL = 'https://testnet.binance.vision/';
    apiKey = process.env.BINANCE_API_KEY_TEST || '';
    apiSecret = process.env.BINANCE_API_SECRET_TEST || '';
    client = new Spot(apiKey, apiSecret, { baseURL: TEST_URL}); //https://docs.binance.us/#klines-websocket , { baseURL: TEST_URL}
}else{
    apiKey = process.env.BINANCE_API_KEY || '';
    apiSecret = process.env.BINANCE_API_SECRET || '';
    client = new Spot(apiKey, apiSecret); //https://docs.binance.us/#klines-websocket , { baseURL: TEST_URL}
}

const DEBUG = false;

const fetchMyAccount = async () => {
    return await client.account()
    .then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    }).catch(error => {
        if(DEBUG) client.logger.error(error.message);
        return error;
    });
}
const avgPrice = async (pair) => {
    return await client.avgPrice(pair).then(response => {
        if(DEBUG) client.logger.log(response.data);
        //return Number(response.data.price);
        return response.data;
    }).catch(error => {
        if(DEBUG) client.logger.error(error); 
        return error;
    });
}
const tickerPrice = async (pair) => {
    return await client.tickerPrice(pair).then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    })
    .catch(error => {
        if(DEBUG) client.logger.error(error); 
        return error;
    });
}
const fetchMyOrders = async (pair) => {
    return await client.allOrders(pair, {limit: 30}).then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    }).catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
const fetchMyTrades = async (pair) => {
    return await client.myTrades(pair).then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    }).catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
const getOrder = async (pair, id) => {
    return await client.getOrder(pair, {
        orderId: id
    }).then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    }).catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
const placeOrder = async (pair, side, type, params) => {
    return await client.newOrder(pair, side, type, params).then(response => {
        if(DEBUG) client.logger.log(response.data); 
        return response.data;
    }).catch(error => {
        client.logger.error(error);
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
const cancelOrder = async (pair, id) => {
    return await client.cancelOrder(pair, {
        orderId: id
    }).then(response => {
        if(DEBUG) client.logger.log(response.data); 
        return response.data;
    })
    .catch(error => {
        if(DEBUG) client.logger.error(error.data);
        return error;
    });
}
const cancelAndReplace = async (pair, side, type, params) => {// STOP_ON_FAILURE  
    return await client.cancelAndReplace(pair, side, type, 'ALLOW_FAILURE', params).then(response =>{
        if(DEBUG) client.logger.log(response.data); 
        return response.data;
    })
    .catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
const assetDetail = async (pair) => {
    return await client.assetDetail({ asset: pair })
    .then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    })
    .catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
const klines = async (pair, interval) => {
    return await client.klines(pair, interval, { limit: 50 }).then(response => {
        if(DEBUG) client.logger.log(response.data);
        return response.data;
    })
    .catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}

//module.exports = { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, cancelAndReplace, assetDetail, klines};
let bot_runs = 0;
let exit_loop = false;
let btcHold = true;  // Starting with BTC
let highestPrice = 0;
let lowestPrice = 0;
let stopLossActive = false;
const TRAILING_PERCENT = 0.002;  // 2%
const STOP_LOSS_PERCENT = 0.0005;  // 0.5%
const MAINPAIR = 'BTCFDUSD'

const sellBTC = async (pair, price, qty) => {
  console.log(`Selling BTC at ${price}`);
  // Implement Binance sell order here
  const newOrder = await placeOrder(pair, 'SELL', 'LIMIT', {
    price: price,
    quantity: qty,
    timeInForce: 'GTC'
});
  stopLossActive = true;
};

const buyBTC = async (pair, price, qty) => {
    console.log(`Buying BTC at ${price}`);
    // Implement Binance buy order here
    const newOrder = await placeOrder(pair, 'BUY', 'LIMIT', {
        price: price,
        quantity: qty,
        timeInForce: 'GTC'
    });
    //symbol, side, type, timeInForce, quantity, price and stopPrice
    /*
  symbol='BNBUSDT',
  type='STOP_MARKET',
  side='SELL',
  stopPrice=220,
  closePosition=True
  */
  stopLossActive = true;
};

const DELAY = 4000;
const botLoop = async ()=> {
    //
    while(!exit_loop){
        console.log('Start ------------');
        //
        const account = await fetchMyAccount();
        //console.log(account);
        const btcBalance = account.balances.find(asset => asset.asset == 'BTC');
        const freeBtc = Number(btcBalance.free);
        const lockedBtc = Number(btcBalance.locked);
        const usdtBalance = account.balances.find(asset => asset.asset == 'FDUSD');
        const freeUsdt = Number(usdtBalance.free);
        const lockedUsdt = Number(usdtBalance.locked);
        console.log(`Total BTC: ${freeBtc + lockedBtc}`);
        console.log(`Total FDUSD: ${freeUsdt + lockedUsdt}`);
        //
        const currentPrice = await tickerPrice(MAINPAIR);
        const parsedPrice = Math.floor((currentPrice.price*100)/100);//Number(currentPrice.price).toFixed(2);
        console.dir(`Current price: ${parsedPrice}`);
        //
        console.log(`High price: ${highestPrice}`);
        console.log(`Low price: ${lowestPrice}`);
        //
        let usdtToBtc = (freeUsdt/parsedPrice).toString();
        usdtToBtc = usdtToBtc;
        const removeAfterIndex= usdtToBtc.indexOf('.');
        const usdtToBtcQuantity= Number(usdtToBtc.substring(0, removeAfterIndex + 6));
        //
        if (btcHold) {
            if (parsedPrice > highestPrice) {
              highestPrice = parsedPrice;
            } else if (parsedPrice <= highestPrice * (1 - TRAILING_PERCENT)) {
              await sellBTC(MAINPAIR, parsedPrice, freeBtc);
              btcHold = false;
              lowestPrice = parsedPrice;
            } else if (stopLossActive && parsedPrice <= highestPrice * (1 - STOP_LOSS_PERCENT)) {
              await sellBTC(MAINPAIR, parsedPrice, freeBtc);
              btcHold = false;
              lowestPrice = parsedPrice;
            }
          } else {

            if (parsedPrice < lowestPrice) {
              lowestPrice = parsedPrice;
            } else if (parsedPrice >= lowestPrice * (1 + TRAILING_PERCENT)) {
              await buyBTC(MAINPAIR, parsedPrice, usdtToBtcQuantity);
              btcHold = true;
              highestPrice = parsedPrice;
            } else if (stopLossActive && parsedPrice >= lowestPrice * (1 + STOP_LOSS_PERCENT)) {
              await buyBTC(MAINPAIR, parsedPrice, usdtToBtcQuantity);
              btcHold = true;
              highestPrice = parsedPrice;
            }
          }
        //
        bot_runs++;
        console.log(bot_runs);
        console.log('\n')
        await wait(DELAY);
    }

}

const wait = async ms => new Promise(resolve => setTimeout(resolve, ms));

botLoop();



