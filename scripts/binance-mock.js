
const fs = require('node:fs');
const { percent } = require('./helpers');

let MOCK_ACCOUNT;
let MOCK_PAIRS;

const isCode200 = () => true;//() => Math.random() >= 0.5; // used to sim error in req randomly

const fileLoader = async () => { // used to manually change values in json file and reload values automatically
    MOCK_ACCOUNT = JSON.parse(fs.readFileSync('./mock-data/account.json', 'utf8'));
    MOCK_PAIRS = JSON.parse(fs.readFileSync('./mock-data/pairs.json', 'utf8'));
}

const fileSaver = async () => {
    //database save
    const accountJ = JSON.stringify(MOCK_ACCOUNT, null, 4);
    const pairsJ = JSON.stringify(MOCK_PAIRS, null, 4);
    //
    await fs.writeFile('./mock-data/account.json', accountJ, err => {
        if (err) {
            console.log(err);
        }
        else {
            //console.log('file written successfully');
        }
    });
    await fs.writeFile('./mock-data/pairs.json', pairsJ, err => {
        if (err) {
            console.log(err);
        }
        else {
            //console.log('file written successfully');
        }
    });
}

const fetchMyAccount = async () => {
    await fileLoader();

    return new Promise((resolve, reject) => {
        //
        MOCK_PAIRS.map(pair => {
            //
            const randomPrice = [
                pair.currentPrice.price + percent(1.1, pair.currentPrice.price),
                pair.currentPrice.price + percent(0.5, pair.currentPrice.price),
                pair.currentPrice.price + percent(0.7, pair.currentPrice.price),
                pair.currentPrice.price - percent(1.1, pair.currentPrice.price),
                pair.currentPrice.price - percent(0.5, pair.currentPrice.price),
                pair.currentPrice.price - percent(0.7, pair.currentPrice.price)
            ];
            //const pairPrice = Number(pair.currentPrice.price);
            const pairPrice = randomPrice[Math.floor(Math.random()*randomPrice.length)]; //random picker
            pair.currentPrice.price = pairPrice;
            pair.avgPrice.price = pairPrice;
            //
            let newOrders = pair.orders.filter(order => order.status == 'NEW'); // partially filled?
            newOrders.forEach(order => {
                const symbols = pair.splitSymbol.split('_');
                const pairBalance = MOCK_ACCOUNT.balances.find(asset => asset.asset == symbols[0]);
                const stableBalance = MOCK_ACCOUNT.balances.find(asset => asset.asset == symbols[1]);
                const stableQty =  Number(pairPrice * order.origQty);
                //console.log('order should go through', Number(order.price) ,pairPrice,order.side)
                if (Number(order.price) >= pairPrice && order.side == 'BUY') { //|| order.price <= pairPrice && order.side == 'SELL'
                    console.log('Setting sell orders to filled', stableBalance)
                    order.status = 'FILLED';
                    order.executedQty = order.origQty;
                    pairBalance.free = Number(Number(pairBalance.free) + Number(order.origQty)).toFixed(4);
                    stableBalance.locked = Number(Number(stableBalance.locked) - stableQty).toFixed(4);
                }
                if (Number(order.price) <= pairPrice && order.side == 'SELL') { //|| order.price <= pairPrice && order.side == 'SELL'
                    console.log('Setting buy orders to filled', stableBalance)
                    order.status = 'FILLED';
                    order.executedQty = order.origQty;
                    pairBalance.locked = Number(Number(pairBalance.locked) - Number(order.origQty)).toFixed(4);
                    stableBalance.free = Number(Number(stableBalance.free) + stableQty).toFixed(4);
                }
            })
        });
        //
        setTimeout(() => {
            if (isCode200()) {
                //console.log(MOCK_ACCOUNT)
                resolve(MOCK_ACCOUNT);
            } else {
                reject('There was a problem with the server, please try again.');
            }
        }, 1000);
        fileSaver();
    });
}

const avgPrice = async (pair) => {
    //await fileLoader();
    const pairPrice = MOCK_PAIRS.find(pr => pr.key == pair).avgPrice;
    return new Promise((resolve, reject) => {

        setTimeout(() => {
            if (isCode200()) {
                resolve(pairPrice);
            } else {
                reject('There was a problem with the server, please try again.');
            }
        }, 1000);
    });
}
const tickerPrice = async (pair) => {
    //await fileLoader();
    return new Promise((resolve, reject) => {
        const pairPrice = MOCK_PAIRS.find(pr => pr.key == pair).currentPrice;
        setTimeout(() => {
            if (isCode200()) {
                resolve(pairPrice);
            } else {
                reject('There was a problem with the server, please try again.');
            }
        }, 1000);
    });
}

const fetchMyOrders = async (pair) => {
    //await fileLoader();
    const orders = MOCK_PAIRS.find(pr => pr.key == pair).orders;
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (isCode200()) {
                resolve(orders);
            } else {
                reject('There was a problem with the server, please try again.');
            }
        }, 1000);
    });
}


const placeOrder = async (pair, side, type, params) => {
    //await fileLoader();

    return new Promise(async (resolve, reject) => {
        setTimeout(async () => {
            if (isCode200()) {
                const nowDate = new Date();
                const order = {
                    symbol: pair,
                    orderId: Math.floor(100000 + Math.random() * 900000),
                    orderListId: -1,
                    clientOrderId: Math.floor(100000 + Math.random() * 900000).toString(),
                    price: params.price,
                    origQty: params.quantity,
                    executedQty: 0.00000000.toString(),
                    cummulativeQuoteQty: 0.00000000.toString(),
                    status: 'NEW',
                    timeInForce: 'GTC',
                    type: type,
                    side: side,
                    stopPrice: 0.00000000.toString(),
                    icebergQty: 0.00000000.toString(),
                    time: nowDate.toString(),
                    updateTime: nowDate.toString(),
                    isWorking: true,
                    workingTime: nowDate,
                    origQuoteOrderQty: 0.00000000,
                    selfTradePreventionMode: 'EXPIRE_MAKER'
                }
                //add order to mock data
                const pairData = MOCK_PAIRS.find(pr => pr.key == pair);
                const symbols = pairData.splitSymbol.split('_');
                //console.log(symbols)
                const pairBalance = MOCK_ACCOUNT.balances.find(asset => asset.asset == symbols[0]);
                const stableBalance = MOCK_ACCOUNT.balances.find(asset => asset.asset == symbols[1]);
                const stableNeeded = Number(params.price * params.quantity); //usdt(or right hand symbol) needed for operation
                const canBuy = stableBalance.free >= stableNeeded;
                const canSell = pairBalance.free >= params.quantity;
                console.log(pairBalance, stableBalance, stableNeeded, canBuy, canSell);
                try {
                    //console.log(stableBalance.free, stableNeeded, canBuy, stableBalance, canSell, pairBalance);
                    if (side == 'BUY' && canBuy) {// simulate asset availavility until order is complete
                        console.log('mock buy order');
                        stableBalance.free = Number(Number(stableBalance.free) - Number(stableNeeded)).toFixed(4);
                        stableBalance.locked = Number(Number(stableBalance.locked) + Number(stableNeeded)).toFixed(4);
                        pairData.orders.unshift(order);//push order to array, its saved later
                        //console.log(pairData.orders[0].price, pairData.orders[1].price);
                    }
                    else if (side == 'SELL' && canSell) {
                        console.log('mock sell order');
                        pairBalance.free = Number(Number(pairBalance.free) - Number(params.quantity)).toFixed(4);
                        pairBalance.locked = Number(Number(pairBalance.locked) + Number(params.quantity)).toFixed(4);
                        pairData.orders.unshift(order);//push order to array, its saved later
                        //console.log(MOCK_PAIRS.find(pr => pr.key == pair).orders[0].price)
                    } else {
                        console.log();
                        throw 'Not enough balance or something';
                    }
                    //console.log(order)
                    //console.log('place method')
                    //console.log(MOCK_PAIRS.find(asset => asset.key == pair).orders[0].price, MOCK_PAIRS.find(asset => asset.key == pair).orders[1].price);
                } catch (error) {
                    console.log(error);
                }

                await fileSaver();
                //console.log(12) 
                resolve(order);
                //const canBuy = params.quantity/params.price >= 
                //if(canBuy){                    
                //}
                //console.log(pairBalance, stableBalance);
            } else {
                reject('There was a problem with the server, please try again.');
            }
        }, 1000);
    });
}



const cancelAndReplace = async (pair, side, type, params) => {
    //await fileLoader();
    const pir = MOCK_PAIRS.find(pr => pr.key == pair);
    const orders = pir.orders;
    const order = orders.find(or => or.id == params.orderId);

    order.status = 'CANCELED';

    const symbols = pir.splitSymbol.split('_');
    const pairBalance = MOCK_ACCOUNT.balances.find(asset => asset.asset == symbols[0]);
    const stableBalance = MOCK_ACCOUNT.balances.find(asset => asset.asset == symbols[1]);
    const stableNeeded = Number(params.price * params.quantity); //usdt(or right hand symbol) needed for operation
    if (order.side == 'BUY') {// simulate asset availavility until order is complete
        console.log('mock buy order');
        stableBalance.free = Number(Number(stableBalance.free) + Number(stableNeeded)).toFixed(4);
        stableBalance.locked = Number(Number(stableBalance.locked) - Number(stableNeeded)).toFixed(4);
        //pir.orders.unshift(order);//push order to array, its saved later
        //console.log(pairData.orders[0].price, pairData.orders[1].price);
    }
    else if (order.side == 'SELL') {
        console.log('mock sell order');
        pairBalance.free = Number(Number(pairBalance.free) + Number(params.quantity)).toFixed(4);
        pairBalance.locked = Number(Number(pairBalance.locked) - Number(params.quantity)).toFixed(4);
        //pir.orders.unshift(order);//push order to array, its saved later
        //console.log(MOCK_PAIRS.find(pr => pr.key == pair).orders[0].price)
    }

    const newOrder = await placeOrder(pair, side, type, params);

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (isCode200()) {
                resolve(newOrder);
            } else {
                reject('There was a problem with the server, please try again.');
            }
        }, 1000);
    });
}


//const cancelAndReplace = async (pair, side, type, params) => {
    //console.log(pair, side, type, 'STOP_ON_FAILURE', params);
    /* params
    {
        price: '10',
        quantity: 1,
        timeInForce: 'GTC',
        cancelOrderId: 12
    }
    */
    /*
     return await client.cancelAndReplace(pair, side, type, 'STOP_ON_FAILURE', params).then(response =>{
         if(DEBUG) client.logger.log(response.data); 
         return response.data;
     }).catch(error => client.logger.error(error))
     .then(response => client.logger.log(response.data))
     .catch(error => {
         if(DEBUG) client.logger.error(error);
         return error;
     });
     */

//}



module.exports = { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, placeOrder, cancelAndReplace };



