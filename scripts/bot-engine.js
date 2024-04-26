/*
This bot tries to short a certain tokean against a stablecoin
In its logic it has a sell mentality, to be countinued,,,
*/

//helpers
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelAndReplace, cancelOrder } = require('./binance-spot.js');
//const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, placeOrder, cancelAndReplace } = require('./binance-mock.js');
const { percent } = require('./helpers.js');
//GLOBAL VARS END

class Bot {
    constructor(account, pairs, emitterCallback, delay = false) {
        if (!account || !pairs || !emitterCallback) {
            throw "Bot constructor missing arguments";
        } else {
            this.account = account;
            this.pairs = pairs;
            this.delay = delay || 1000;
            this.emitterCallback = emitterCallback;
            this.botLoop = this.botLoop.bind(this);
            this.exit_loop = true;
            this.debug = true;
            this.partial_counter = 0;
            this.loss_up_counter = 0;
            this.loss_down_counter = 0;
            this.counter_limit = 250; // delay for recancelling orders etc
        }
    }
    startBot() {
        if (!this.exit_loop) { return }//to prevent restart
        console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
        this.exit_loop = false;
        this.botLoop();
    }
    stopBot() {
        if (this.exit_loop) { return }//to prevent restop
        console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
        this.exit_loop = true;
    }
    async botLoop() {
        let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
        this.account = await fetchMyAccount();
        this.pairs.forEach((pair) => {
            //if (pair.active) { }
            //const keyPair = pair.key.split("_").join('');
            promiseArray.push(new Promise(async (resolve, reject) => {
                //let tt = await assetDetail(pair); doesnt work on testnet, it does on mainnet
                pair.currentPrice = await tickerPrice(pair.key);
                pair.avgPrice = await avgPrice(pair.key);
                pair.orders = await fetchMyOrders(pair.key);
                pair.margin_percent = percent(pair.margin, pair.avgPrice.price);
                console.log('------');
                console.log('\x1b[33m%s\x1b[0m', pair.key);
                //Search last order
                let LAST_ORDER = pair.orders.length > 0 ? pair.orders.sort((a, b) => {
                    return new Date(b.time) - new Date(a.time);
                })[0] : false;
                // redundant condition (LAST_ORDER && pair.orders.length > 0)
                if (LAST_ORDER && pair.orders.length > 0) { // redundant but it helps :(. Sort sometimes delays and returns undefined. Maybe return a promise from sort function/last order?
                    //parse into nums just in case, some are strings
                    LAST_ORDER.price = Number(LAST_ORDER.price);
                    pair.currentPrice.price = Number(pair.currentPrice.price);
                    pair.avgPrice.price = Number(pair.avgPrice.price);
                    if (LAST_ORDER.status == 'CANCELED') {
                        //order was canceled 
                        console.log('CREATE NEW ORDER?');
                    }
                    else if (LAST_ORDER.status == 'NEW') {
                        //order is pending/new
                        console.log('WAITING FOR ORDER TO BE FILLED');
                        //check to see if price is below loss percent, if it is, cancel last order and create sell oder.
                        const downTrigger = (LAST_ORDER.price - percent(pair.lowPcnt, LAST_ORDER.price));
                        const upTrigger = (LAST_ORDER.price + percent(pair.hghPcnt, LAST_ORDER.price));
                        const loss_contition_down = pair.currentPrice.price < downTrigger && LAST_ORDER.side == 'SELL';// sell mentality
                        const loss_contition_up = pair.currentPrice.price > upTrigger && LAST_ORDER.side == 'BUY';// sell mentality
                        console.log('Watch for- DOWN:', downTrigger, 'UP:', upTrigger);
                        if(loss_contition_down){// sell mentality, reprice if conditions are 2far off down
                            console.log('Waiting to reorder loss down', this.loss_down_counter );
                            if(this.loss_down_counter >= this.counter_limit){
                                console.log(`PRICE HAS FALLEN BY ${pair.lowPcnt}%`);                          
                                console.log('SELLING/LOW');
                                this.loss_down_counter = 0;
                                //await cancelOrder(keyPair, LAST_ORDER.id);
                                //return; //stop bot
                                const rePrice = (pair.avgPrice.price + percent(pair.tgtPcnt, pair.avgPrice.price)).toFixed(1);// last change was + percent instead of - %, next try selling to avg or current price
                                //console.log(rePrice);
                                LAST_ORDER = await cancelAndReplace(pair.key, 'SELL', 'LIMIT', {price: rePrice, quantity: LAST_ORDER.origQty, timeInForce: 'GTC', cancelOrderId: LAST_ORDER.orderId});
                                this.emitterCallback('order placed', LAST_ORDER);
                            }
                            this.loss_down_counter++
                        } 
                        else if (loss_contition_up) {// sell mentality reprice if conditions are 2far off up
                            console.log('Waiting to reorder loss up', this.loss_up_counter );
                            if(this.loss_up_counter >= this.counter_limit){
                                console.log(`PRICE HAS RISEN BY ${pair.hghPcnt}%`);                          
                                console.log('REBUYING/HIGH');
                                this.loss_up_counter = 0;
                                const rePrice = (pair.currentPrice.price - percent(pair.tgtPcnt, pair.currentPrice.price)).toFixed(1);
                                //console.log(rePrice)
                                LAST_ORDER = await cancelAndReplace(pair.key, 'BUY', 'LIMIT', {price: rePrice, quantity: LAST_ORDER.origQty, timeInForce: 'GTC', cancelOrderId: LAST_ORDER.orderId});
                                this.emitterCallback('order placed', LAST_ORDER);
                            }
                            this.loss_up_counter++;
                        } 
                    }
                    else if (LAST_ORDER.status == 'PARTIALLY_FILLED') {
                        console.log('WAITING FOR PARTIALLY FILLED ORDER', this.partial_counter);
                        this.partial_counter++;
                        if(this.partial_counter >= this.counter_limit){//only for one side? sell and buy needed
                            console.log(`Too much waiting`);                          
                            console.log('REBUYING/HIGH');
                            this.partial_counter = 0;
                            let rePrice = (pair.currentPrice.price - percent(pair.tgtPcnt, pair.currentPrice.price)).toFixed(1); //BUY PRICE
                            if(LAST_ORDER.side == 'SELL'){
                                rePrice = pair.currentPrice.price;//SELL PRICE
                            }
                            //console.log(rePrice)
                            LAST_ORDER = await cancelAndReplace(pair.key, LAST_ORDER.side == 'SELL' ? 'SELL':'BUY', 'LIMIT', {price: rePrice, quantity: (LAST_ORDER.origQty-LAST_ORDER.executedQty).toFixed(6), timeInForce: 'GTC', cancelOrderId: LAST_ORDER.orderId});
                            this.emitterCallback('order placed', LAST_ORDER);
                        }
                    }
                    else if (LAST_ORDER.status == 'FILLED') {
                        //order was filled & create new order
                        console.log('ORDER FILLED WAS ', LAST_ORDER.side);
                        let type = '';
                        let price = 0;
                        let qty = pair.defaultQty; //pair.defaultQty || balance ,,,for the future
                        let percentage = percent(pair.tgtPcnt, Number(LAST_ORDER.price));
                        if (LAST_ORDER.side == 'BUY') {
                            type = 'SELL';
                            price = (LAST_ORDER.price + pair.currentPrice.price)/2 + percentage//Number().toFixed(4); //promediar con avgPrice ? sino el valor siempre va a ser el mismo
                            //price = Number(pair.avgPrice.price) + percentage//Number().toFixed(4);
                        } else if (LAST_ORDER.side == 'SELL') {
                            type = 'BUY';
                            price = pair.avgPrice.price - percentage//Number().toFixed(4); 
                            //price = Number(LAST_ORDER.price) - percentage//Number().toFixed(4);
                        }
                        console.log('PLACING ORDER ', type);
                        LAST_ORDER = await placeOrder(pair.key, type, 'LIMIT', {
                            price: price.toFixed(1),
                            quantity: qty,
                            timeInForce: 'GTC'
                        });
                        this.emitterCallback('order placed', LAST_ORDER);
                    }
                }
                else {//Only for first start,
                    console.log('NO ORDERS, CREATE NEW STARTING ORDER FOR', pair);
                    /*
                        Place order using avgPrice manually, for now,,,
                    */
                }
                resolve();
            }));
        });
        //
        //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
        return Promise.all(promiseArray).then(async () => {
            await this.emitterCallback('Bot Emit');
            if (!this.exit_loop) setTimeout(this.botLoop, this.delay); //loops
        }).catch(error => {
            console.log(error);
        });
        /*
        if(!EXIT_MAIN_LOOP) setTimeout(mainLoop, delay); //loops
        */
    }

}



module.exports = { Bot };
