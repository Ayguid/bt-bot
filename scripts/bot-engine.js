//helpers
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelAndReplace, cancelOrder } = require('./binance-spot.js');
const { percent } = require('./helpers.js');
//GLOBAL VARS END

class Bot {
    constructor(account, pairs, emitterCallback, delay = false) {
        if (!account || !pairs || !emitterCallback) {
            throw "Bot constructor migging arguments";
        } else {
            this.account = account;
            this.pairs = pairs;
            this.delay = delay || 1000;
            this.emitterCallback = emitterCallback;
            this.botLoop = this.botLoop.bind(this);
            this.exit_loop = true;
            this.debug = true;
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
                pair.currentPrice = await tickerPrice(pair.key);
                pair.avgPrice = await avgPrice(pair.key);
                pair.orders = await fetchMyOrders(pair.key);
                pair.margin_percent = percent(pair.margin, pair.avgPrice.price);
                console.log('------');
                console.log('\x1b[33m%s\x1b[0m', pair.key);
                //Search last order
                const LAST_ORDER = pair.orders.length > 0 ? pair.orders.sort((a, b) => {
                    return new Date(b.time) - new Date(a.time);
                })[0] : false;

                // redundant condition (LAST_ORDER && pair.orders.length > 0)
                if (LAST_ORDER && pair.orders.length > 0) { // redundant but it helps :(. Sort sometimes delays and returns undefined. Maybe return a promise from sort function/last order?
                    if (LAST_ORDER.status == 'CANCELED') {
                        //order was canceled 
                        console.log('CREATE NEW ORDER?');
                    }
                    else if (LAST_ORDER.status == 'NEW') {
                        //order is pending/new
                        console.log('WAITING FOR ORDER TO BE FILLED');
                        //check to see if price is below loss percent, if it is, cancel last order and create sell oder.
                        const loss_contition_down = Number(pair.currentPrice.price) < (Number(LAST_ORDER.price) - Number(percent(pair.stpPcnt, LAST_ORDER.price)));
                        if(loss_contition_down){
                            console.log(`PRICE HAS FALLEN BY ${pair.stpPcnt}`);
                            //console.log(pair.avgPrice.price);
                            //console.log(LAST_ORDER.price);
                            //console.log(percent(pair.stpPcnt, LAST_ORDER.price));
                            //console.log('------');
                            if (LAST_ORDER.side == 'SELL') {
                                console.log('SELLING/LOW AND REBUYING');
                                //await cancelOrder(keyPair, LAST_ORDER.id);
                                const rePrice = (Number(pair.avgPrice.price) - Number(percent(pair.tgtPcnt, pair.avgPrice))).toFixed(4);
                                console.log(rePrice);
                                
                                LAST_ORDER = await cancelAndReplace(keyPair, 'SELL', 'LIMIT', 
                                    { 
                                        price: rePrice, 
                                        quantity: 100, 
                                        timeInForce: 'GTC',
                                        cancelOrderId: LAST_ORDER.id
                                    }
                                );
                                this.emitterCallback('order placed', LAST_ORDER);                                
                            }
                        }
                    }
                    else if (LAST_ORDER.status == 'PARTIALLY_FILLED') {
                        console.log('WAITING FOR PARTIALLY FILLED ORDER');
                    }
                    else if (LAST_ORDER.status == 'FILLED') {
                        //order was filled & create new order
                        console.log('ORDER FILLED WAS ', LAST_ORDER.side);

                        let type = '';
                        let price = 0;
                        let qty = pair.defaultQty; //pair.defaultQty || balance ,,,for the future
                        let percentage = percent(pair.tgtPcnt, Number(LAST_ORDER.price));
                        //let percentage = percent(pair.tgtPcnt, Number(pair.avgPrice.price));
                        if (LAST_ORDER.side == 'BUY') {
                            type = 'SELL';
                            price = (Number(LAST_ORDER.price)+Number(pair.currentPrice.price))/2 + percentage//Number().toFixed(4); //promediar con avgPrice ? sino el valor siempre va a ser el mismo
                            //price = Number(pair.avgPrice.price) + percentage//Number().toFixed(4);
                        } else if (LAST_ORDER.side == 'SELL') {
                            type = 'BUY';
                            price = Number(LAST_ORDER.price) - percentage//Number().toFixed(4); 
                            //price = Number(pair.avgPrice.price) - percentage//Number().toFixed(4);
                        }
                        console.log('PLACING ORDER ', type);
                        LAST_ORDER = await placeOrder(pair.key, type, 'LIMIT', {
                            price: price.toFixed(2),
                            quantity: qty,
                            timeInForce: 'GTC'
                        });
                        this.emitterCallback('order placed', LAST_ORDER);
                        //console.log('ORDER FILLED WAS/BUY', order.side);
                    }
                }
                else {//Only for first start,
                    console.log('NO ORDERS, CREATE NEW STARTING ORDER FOR PAIR');
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
            //mainLoop;
        });
        /*
        // let tt = await assetDetail('BTC'); doesnt work on testnet
        if(!EXIT_MAIN_LOOP) setTimeout(mainLoop, delay); //loops
        */
    }

}



module.exports = { Bot };
