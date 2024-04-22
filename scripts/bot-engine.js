//helpers
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder } = require('./binance-spot.js');
const { percent } = require('./helpers.js');
//GLOBAL VARS END

class Bot {
    constructor(account, pairs, emitterCallback) {
        if(!account || !pairs || !emitterCallback){
            throw "Bot constructor migging arguments";
        }else {
            this.account = account;
            this.pairs = pairs;
            this.delay = 2000;
            this.emitterCallback = emitterCallback;
            this.startBotLoop = this.startBotLoop.bind(this);
            this.exit_loop = false;
            this.debug = true;
        }
    }
    stopBot(){
        this.exit_loop = true;
    }
    async startBotLoop() {
        let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
        this.account = await fetchMyAccount();

        Object.keys(this.pairs).forEach((keys) => {
            //const keyPair = keys.split("_").join('');
            //console.log(keys, keyPair);
            promiseArray.push(new Promise(async (resolve, reject) => {
                this.pairs[keys].currentPrice = await tickerPrice(keys);
                this.pairs[keys].avgPrice = await avgPrice(keys);
                this.pairs[keys].orders = await fetchMyOrders(keys);
                this.pairs[keys].margin_percent = percent(this.pairs[keys].margin, this.pairs[keys].avgPrice.price);
                //Search last order
                /*
                this.pairs[keyPair].last_order = this.pairs[keyPair].orders.length > 0 ? this.pairs[keyPair].orders.sort((a,b)=>{ 
                    return new Date(b.time) - new Date(a.time);
                })[0] : false;
                */
                const LAST_ORDER = this.pairs[keys].orders.length > 0 ? this.pairs[keys].orders.sort((a,b)=>{ 
                    return new Date(b.updateTime) - new Date(a.updateTime);
                })[0] : false;

                if(LAST_ORDER && this.pairs[keys].orders.length>0){
                    //console.log(LAST_ORDER.symbol, LAST_ORDER.side, LAST_ORDER.status, LAST_ORDER.origQty, LAST_ORDER.price);
                    if(LAST_ORDER.status == 'NEW' || LAST_ORDER.status == 'PARTIALLY_FILLED') {
                        //order is pending/new
                        console.log('WAITING FOR ORDER TO BE FILLED');
                        //await this.emitterCallback('waiting');
                        //check to see if price is below loss percent, if it is, cancel last order and create sell oder.
                        //if(ORDERS[keyPair].avgPrice < LAST_ORDER.price - percent(ORDERS[keyPair].stpPcnt, LAST_ORDER.price)){
                            //console.log('PRICE HAS FALLEN BY SELLING AND REBUYING');
                            //console.log(LAST_ORDER.price - percent(ORDERS[keyPair].stpPcnt, LAST_ORDER.price));
                            //await cancelOrder(keyPair, LAST_ORDER.id);
                            /*
                            LAST_ORDER = await placeOrder(keyPair, 'BUY', 'LIMIT', 
                            { price: (ORDERS[keyPair].avgPrice - percent(ORDERS[keyPair].tgtPcnt, ORDERS[keyPair].avgPrice)).toFixed(4), 
                              quantity: 100, 
                              timeInForce: 'GTC'
                            });
                            */
                            //console.log(ORDERS[keyPair].avgPrice <= LAST_ORDER.price - percent(ORDERS[keyPair].tgtPcnt, LAST_ORDER.price));
                        //}
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
                        let qty = 0.1;
                        let percentage = percent(this.pairs[keys].tgtPcnt, Number(LAST_ORDER.price));
                        if (LAST_ORDER.side == 'BUY'){
                            type = 'SELL';
                            price = Number(LAST_ORDER.price) + percentage//Number().toFixed(4);
                        }else if(LAST_ORDER.side == 'SELL') {
                            type = 'BUY';
                            price = Number(LAST_ORDER.price) - percentage//Number().toFixed(4);
                        }
                        
                        await placeOrder(keys, type, 'LIMIT', {
                            price: price.toFixed(2), 
                            quantity: qty, 
                            timeInForce: 'GTC'
                        });
                        
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
        //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
        return Promise.all(promiseArray).then(async () => {
            //console.log('Saving files');
            await this.emitterCallback('Bot Emit');
            /*
            if(this.debug){
            }
            */
            if (!this.exit_loop) setTimeout(this.startBotLoop, this.delay); //loops
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
