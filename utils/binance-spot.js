const { Spot } = require('@binance/connector');

const TESTNET = process.env.TESTNET === 'true';
const TEST_URL = 'https://testnet.binance.vision/';
const apiKey = TESTNET ? process.env.BINANCE_API_KEY_TEST : process.env.BINANCE_API_KEY;
const apiSecret = TESTNET ? process.env.BINANCE_API_SECRET_TEST : process.env.BINANCE_API_SECRET;

const client = new Spot(apiKey, apiSecret, { baseURL: TESTNET ? TEST_URL : undefined });

const DEBUG = true;

// Centralized error handling function
const handleApiError = (error, methodName, params = {}) => {
    if (DEBUG) client.logger.error(error);
    return { 
        error: `Failed to execute ${methodName}`, 
        details: error.message,
        params
    };
};

// Wrapper function for API calls, binding the client context
const makeApiCall = async (method, ...args) => {
    try {
        const response = await method.bind(client)(...args);
        //if (DEBUG) client.logger.log(response.data);
        return response.data;
    } catch (error) {
        return handleApiError(error, method.name, args);
    }
};

// Refactored API methods with proper binding
const serverTime = () => makeApiCall(client.time);
const fetchMyAccount = () => makeApiCall(client.account);
const avgPrice = (pair) => makeApiCall(client.avgPrice, pair);
const tickerPrice = (pair) => makeApiCall(client.tickerPrice, pair);
const fetchMyOrders = (pair) => makeApiCall(client.allOrders, pair, { limit: 30, timestamp: 123123 });
const fetchMyTrades = (pair) => makeApiCall(client.myTrades, pair);
const getOrder = (pair, id) => makeApiCall(client.getOrder, pair, { orderId: id });
const placeOrder = (pair, side, type, params) => makeApiCall(client.newOrder, pair, side, type, params);
const cancelOrder = (pair, id) => makeApiCall(client.cancelOrder, pair, { orderId: id });
const cancelAndReplace = (pair, side, type, params) => makeApiCall(client.cancelAndReplace, pair, side, type, 'ALLOW_FAILURE', params);
const assetDetail = (pair) => makeApiCall(client.assetDetail, { asset: pair });
const userAsset = (pair) => makeApiCall(client.userAsset, { asset: pair });
const klines = (pair, interval) => makeApiCall(client.klines, pair, interval, { limit: 120 });
const exchangeInfo = (params) => makeApiCall(client.exchangeInfo, params);

module.exports = {
    serverTime, fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades,
    placeOrder, getOrder, cancelOrder, cancelAndReplace, assetDetail, userAsset, klines, exchangeInfo
};


/*

client.exchangeInfo().then(response => client.logger.log(response.data))
client.exchangeInfo({ symbol: 'btcusdt' }).then(response => client.logger.log(response.data))
client.exchangeInfo({ symbols: ['btcusdt', 'BNBUSDT'] }).then(response => client.logger.log(response.data))
*/