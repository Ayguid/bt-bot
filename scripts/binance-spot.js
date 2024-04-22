//LIBS
//const EventEmitter = require('node:events');
//KEYS AND URL
const apiKey = process.env.BINANCE_API_KEY_TEST || '';
const apiSecret = process.env.BINANCE_API_SECRET_TEST || '';
const TEST_URL = 'https://testnet.binance.vision/';
// BINANCE CONECTOR
const { Spot } = require('@binance/connector');
const client = new Spot(apiKey, apiSecret, { baseURL: TEST_URL});

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
    return await client.allOrders(pair).then(response => {
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
        return response.data
    }).catch(error => {
        client.logger.error(error);
        if(DEBUG) client.logger.error(error);
        return error;
    });
}

const cancelOrder = async (pair, id) => {
    return await client.cancelOrder(pair, {
        orderId: id
    }).then(response => client.logger.log(response.data))
    .catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}

const assetDetail = async (pair) => {
    return await client.assetDetail({ asset: 'BNB' })
    .then(response => {
        //client.logger.log(response.data);
        return response.data;
    })
    .catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}

/*
const cancelAndReplace = async (pair, id) => {
    return await client.cancelAndReplace('BNBUSDT', 'BUY', 'LIMIT', 'STOP_ON_FAILURE', {
        price: '10',
        quantity: 1,
        timeInForce: 'GTC',
        cancelOrderId: 12
      }).then(response => client.logger.log(response.data))
    .catch(error => {
        if(DEBUG) client.logger.error(error);
        return error;
    });
}
*/
module.exports = { fetchMyAccount, avgPrice, tickerPrice,fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail};

