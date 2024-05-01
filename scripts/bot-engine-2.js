/*
This bot tries to short a certain tokean against a stablecoin
In its logic it has a sell mentality, to be countinued,,,
*/
//helpers
const clc = require("cli-color"); //https://github.com/medikoo/cli-color
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelAndReplace, cancelOrder, klines } = require('./binance-spot-2.js');
//const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, placeOrder, cancelAndReplace } = require('./binance-mock.js');
const { minusPercent, plusPercent, timePassed, calculateProfit } = require('../utils/helpers.js');
const { getIndicators } = require('../utils/indicators.js');
//GLOBAL VARS END

const rderror = clc.red.bold;
const warn = clc.yellow;
const notice = clc.blue.underline;//console.log(clc.red.bgWhite.underline("Underlined red text on white background."));
const grnotice = clc.green;

class Bot {
    constructor(pairs, emitterCallback, delay = false) {
        if (!pairs || !emitterCallback) {
            throw "Bot constructor missing arguments";
        } else {
            this.bot_runs = 0;
            this.account = {};
            this.pairs = pairs;
            this.delay = delay || 2000;
            this.emitterCallback = emitterCallback;
            this.exit_loop = true; //inits in true! bot hasnt started yet
            //this.botLoop = this.botLoop.bind(this);
        }
    }
    startBot() {
        if (!this.exit_loop) { return }//Prevent restart
        console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
        this.exit_loop = !this.exit_loop;
        this.botLoop();
    }
    stopBot() {
        if (this.exit_loop) { return }//Prevent restop
        console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
        this.exit_loop = !this.exit_loop;
        this.bot_runs = 0;
    }
    // Pauses execution for a specified amount of time
    wait = async ms => new Promise(resolve => setTimeout(resolve, ms));
    printOrderStatus = order =>{
        const verb = order.status == 'FILLED' ? 'was': 'is';
        console.log(`Side ${verb}:`, order.side);
        console.log(`Price ${verb}:`, grnotice(order.price));
        console.log(`Qty ${verb}:`, order.origQty);
        console.log(`ExQty ${verb}:`, order.executedQty);
        console.log(`Status:`, order.status);
    }
    aproveBuyIndicators = (pair) =>{
        return [
            pair.indicators.CURRENT_STOCH_RSI.k < pair.stochBuyLimit,
            pair.indicators.CURRENT_MACD.MACD < pair.macdBuyLimit,
            pair.indicators.CURRENT_ADX.adx < pair.adxBuyLimit,
            pair.indicators.CURRENT_AO < pair.aoBuyLimit
        ].filter(element=>element).length >= 2; //at least 2 conditions are met between 4 indicators
    }
    //
    async handleCanceledOrder(){
        console.log(notice('------ Doing something according to canceled order'));
    }
    async handleNewOrder(order, pair){
        console.log(notice('------ According to new/pending order'));
        this.printOrderStatus(order);
        //
        const profit = calculateProfit(pair.currentPrice.price, order.price);
        if(order.side == 'SELL') console.log('Profit would be:', profit);
        //
        const upTrigger = plusPercent(pair.hghTriggPcnt, order.price);
        const downTrigger = minusPercent(pair.lowTriggPcnt, order.price); // change to ask for paid price vs?
        /*
        const paidPrice = minusPercent(pair.buyLPcnt, order.price);
        */
        const loss_contition_up = pair.currentPrice.price > upTrigger && order.side == 'BUY';
        const loss_contition_down = pair.currentPrice.price < downTrigger && order.side == 'SELL';
        const orderPriceD = order.price;
        pair.triggers = { //add triggers to pairs data for display purposes
            ...(order.side == 'BUY' && {upTrigger}),
            ...(order.side == 'SELL' && {downTrigger}),
            orderPriceD
        }
        //Print watch values for triggers according to order side/trigger side
        console.log(`Watch for- ${order.side == 'SELL'? 'DOWN': 'UP'}:`, order.side == 'SELL'? downTrigger : upTrigger, 'Current Price:', pair.currentPrice.price);
        //
        let rePrice;
        //
        const isBuyContition = this.aproveBuyIndicators(pair);
        //
        if (loss_contition_up) {// BUY reprice if conditions are 2far up
            console.log(warn(`PRICE IS UP BY ${pair.hghTriggPcnt}%`));                          
            //console.log('REBUYING/HIGH');
            rePrice = minusPercent(pair.repUpPct, pair.currentPrice.price).toFixed(pair.stableDecimals);
        }
        else if(loss_contition_down){// SELL reprice if conditions are 2far down, maybe add timer to wait before reselling lower
            console.log(warn(`PRICE IS DOWN BY ${pair.lowTriggPcnt}%`));                          
            //console.log('SELLING/LOW');
            rePrice = plusPercent(pair.repDwPct, pair.avgPrice.price).toFixed(pair.stableDecimals);
        }
        // 
        if((loss_contition_up && isBuyContition) || loss_contition_down){
            console.log('Repricing - ', order.side, rePrice);
            const newOrder = await cancelAndReplace(pair.key, order.side, 'LIMIT', {price: rePrice, quantity: order.origQty, timeInForce: 'GTC', cancelOrderId: order.orderId});
            await this.emitterCallback('order placed', newOrder); 
        }else if(loss_contition_up && !isBuyContition){
            console.log(notice('Waiting indicators to reprice buy'));
        }
        //
    }
    async handleFilledOrder(order, pair){
        console.log(notice('------ Doing something according to filled order'));
        this.printOrderStatus(order);
        //
        let newSide = order.side == 'BUY' ? 'SELL': 'BUY';
        let qty = pair.defaultQty;
        let price = (()=>{
            if(newSide == 'SELL') return plusPercent(pair.tgtPcnt, order.price); // sell price
            return minusPercent(pair.buyLPcnt, pair.avgPrice.price); //buy price % buyLPcnt avgPrice
        })();
        //
        const isBuyContition = this.aproveBuyIndicators(pair);
        //
        if(newSide == 'SELL' || (newSide == 'BUY' && isBuyContition)){
            console.log(grnotice('PLACING ORDER:', newSide, price));
            const newOrder = await placeOrder(pair.key, newSide, 'LIMIT', {
                price: Number(price).toFixed(pair.stableDecimals),
                quantity: qty,
                timeInForce: 'GTC'
            });
            this.emitterCallback('order placed', newOrder);
        }else{
            console.log(notice('Indicators not ok, waiting to buy..')); 
        }
        //
    }
    async handlePartialOrder(order, pair){
        console.log(notice('------ Doing something according to partially filled order'));
        const waited_time = timePassed(new Date(order.updateTime));
        //
        if(waited_time >= pair.partialWait){
            console.log('Time passed waiting', waited_time, pair.partialWait);
            console.log(`Too much waiting`);
            let rePrice = (()=>{
                if(order.side == 'SELL') return pair.currentPrice.price;// sell price
                return minusPercent(pair.buyLPcnt, pair.currentPrice.price).toFixed(pair.stableDecimals);//buy price
            })();
            const newOrder = await cancelAndReplace(pair.key, order.side == 'SELL' ? 'SELL':'BUY', 'LIMIT', {price: rePrice, quantity: (order.origQty-order.executedQty).toFixed(pair.tokenDecimals), timeInForce: 'GTC', cancelOrderId: order.orderId});
            this.emitterCallback('order placed', newOrder);
        }else {
            console.log('Waiting for', waited_time, pair.partialWait)
        }
    }
    //
    async botLoop() {
        //
        while(!this.exit_loop){
            console.log(warn('Start ------------'));
            //
            let promiseArray = [];  
            this.account = await fetchMyAccount();
            //
            this.pairs.forEach((pair) => {
                promiseArray.push(new Promise(async (resolve, reject) => {
                    //Step Display
                    //Prices and orders
                    console.log(notice('------ Fetching prices, orders && indicators ------'));
                    pair.currentPrice = await tickerPrice(pair.key);
                    pair.avgPrice = await avgPrice(pair.key);
                    pair.orders = await fetchMyOrders(pair.key);
                    const candles = await klines(pair.key, '2h');
                    pair.indicators = await getIndicators(candles);
                    //Print prices & indicators
                    console.log(pair.key, 'C:', grnotice(pair.currentPrice.price), 'A:', grnotice(pair.avgPrice.price));
                    console.log('STOCH RSI', pair.indicators.CURRENT_STOCH_RSI, 'MACD:', pair.indicators.CURRENT_MACD, 'ADX:', pair.indicators.CURRENT_ADX, 'AO:', pair.indicators.CURRENT_AO);
                    //Search for the last order and sort them (orders) this step is critical
                    let LAST_ORDER = pair.orders.length > 0 ? pair.orders.sort((a, b) => {
                        return new Date(b.time) - new Date(a.time);
                    })[0] : false;
                    //to be used later on with reprice, not implemented yet
                    /*
                    let LAST_BUY_ORDER = false;
                    for (let i = 0; i < pair.orders.length; i++) {
                        if (pair.orders[i].status == 'FILLED' && pair.orders[i].side == 'BUY') { 
                            LAST_BUY_ORDER = pair.orders[i];
                            break; 
                        }
                    }
                    console.log(LAST_BUY_ORDER);
                    */
                    //
                    if(!LAST_ORDER) console.log('Create starting order manually'); 
                    else{
                        LAST_ORDER.price = Number(LAST_ORDER.price);
                        pair.currentPrice.price = Number(pair.currentPrice.price);
                        pair.avgPrice.price = Number(pair.avgPrice.price);
                        switch (LAST_ORDER.status) {
                            case 'CANCELED':
                                await this.handleCanceledOrder();
                                break;
                            case 'NEW':
                                await this.handleNewOrder(LAST_ORDER, pair);
                                break;
                            case 'PARTIALLY_FILLED':
                                await this.handlePartialOrder(LAST_ORDER, pair);
                                break;
                            case 'FILLED':
                                await this.handleFilledOrder(LAST_ORDER, pair);
                                break;
                            default:
                                console.log(LAST_ORDER.status);
                                break;
                        }
                    }
                    resolve();
                }));
            });
            //
            //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
            await Promise.all(promiseArray).then(async () => {
                await this.emitterCallback();
            }).catch(error => {
                console.log(error);
                console.log(rderror(error));
            });
            //wait until next loop
            this.bot_runs++;
            console.log(warn('END, runs made:', this.bot_runs));
            console.log('\n')
            await this.wait(this.delay);
        }

    }

}
//cancelOrder('8571283', 4228567);

//
module.exports = { Bot };
