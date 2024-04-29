//es6 syntax for modules, old require is used for compatbility with libs
//import {checkAndCreateFolder} from './fileManager.js';
require('dotenv').config(); // env config
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail, klines} = require('./scripts/binance-spot-2.js');
//https://taapi.io/indicators/stochrsi-stochastic-relative-strength-index/
const TAAPI_SECRET= process.env.TAAPI_SECRET || '';
const INDICATOR_API_DELAY = 16; // expresed in secs
let stoch_rsi;

let last_stoch_time = Date.now();
//
const { StochasticRSI } = require('technicalindicators');

// Updates the input for the stochastic RSi calculation. It adds the newedt price and removes the oldest one.
const getStochRSI = async () => {
    const CANDLEINTERVAL = '1m'
    const SYMBOL = 'BTC/USDT'
    
    if(timePassed(last_stoch_time) > INDICATOR_API_DELAY){ // only exectues if x secs have passed since last req
        last_stoch_time = Date.now();
        try {
            console.log('UPDATING STOCH RSI');
            const dirapi = `https://api.taapi.io/stochrsi?secret=${TAAPI_SECRET}&exchange=binance&symbol=${SYMBOL}&interval=${CANDLEINTERVAL}`
            const response = await fetch(dirapi);
            stoch_rsi = await response.json();
            //stoch_rsi_2 = await klines('BTCUSDT', '1m');
            //console.log(stochRSI)
            //return stoch_rsi;
        } catch (error) {
            console.error('ERROR IN getStochRSI(): ', e);
        }
    }
    //const dirapi = `https://api.taapi.io/stochrsi?secret=${TAAPI_SECRET}&exchange=binance&symbol=${SYMBOL}&interval=${CANDLEINTERVAL}`
    //const response = await fetch(dirapi);
    //const stockRSI = await response.json();
    //await wait(4000);
    //return stockRSI
    //console.log(stockRSI);
    /*
    try {
        console.log('UPDATING STOCH RSI');
        const dirapi = `https://api.taapi.io/stochrsi?secret=${TAAPI_SECRET}&exchange=binance&symbol=${SYMBOL}&interval=${CANDLEINTERVAL}`
        const response = await fetch(dirapi);
        stochRSI = await response.json();
        //console.log(stochRSI)
        setTimeout(getStochRSI, INDICATOR_API_DELAY); //loops
    } catch (error) {
        console.error('ERROR IN getStochRSI(): ', e);
    }
    */
}

const timePassed = (start) =>{
    // get the end time 
    let end = Date.now(); 
    
    // elapsed time in milliseconds 
    let elapsed = end - start;    
    
    // converting milliseconds to seconds  
    // by dividing 1000 
    return (elapsed/1000); 
}
/*
(async function main(){

	try {
        const candles = await klines('BTCUSDT', '1m');
        const filterCandles = candles.map( candle=> candle[4] );
        //console.log(filterCandles)
        stoch_rsi_2 = StochasticRSI.calculate({
            values : filterCandles,
            rsiPeriod : 14,
            stochasticPeriod : 14,
            kPeriod : 3,
            dPeriod : 3,
        });
        const CURRENT_STOCH_RSI = stoch_rsi_2[stoch_rsi_2.length -1];
        console.log(CURRENT_STOCH_RSI);
        if(CURRENT_STOCH_RSI.k < 30){
            console.log('Try to buy');
        } else if(CURRENT_STOCH_RSI.k > 90){
            console.log('Try to sell');
        }
        setTimeout(main, 1500); //loops
	} catch (e) {
		console.error('ERROR: ', e);
		//process.exit(-1);
	}
})();
*/

// Pauses execution for a specified amount of time
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
// Initializes the input with minutly prices for the stochastic RSI calculation





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