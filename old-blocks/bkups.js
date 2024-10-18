//working great 
/*
require('dotenv').config(); // env config
const { klines } = require('./scripts/binance-spot.js');
const { Table } = require('console-table-printer');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const tBot = new TelegramBot(token, { polling: true });
const SAVE_DATA = false;

let EXIT_LOOP = true;
const DELAY = 5000;
let PAIRS_LOOP_INDEX = 0;

const PAIRS = [
    ['BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'FET_USDT', 'FTM_USDT', 'FIO_USDT'],
    ['ICP_USDT', 'COTI_USDT', 'KP3R_USDT', 'AVAX_USDT', 'LINK_USDT', 'MATIC_USDT'],
    ['FLOKI_USDT', 'PEPE_USDT', 'WIF_USDT', 'BONK_USDT', 'PEOPLE_USDT', 'TURBO_USDT'],
    ['SOL_USDT', '1INCH_USDT', 'ARKM_USDT', 'BURGER_USDT', 'BLZ_USDT', 'DOGS_USDT']
];
let PAIRS_DATA = {};

// Telegram Bot message handling
tBot.on('message', (msg) => {
    if (msg.from.id == process.env.TELEGRAM_MY_ID) {
        if (msg.text == 'start') { startBot(); }
        if (msg.text == 'stop') { stopBot(); }
    }
    tBot.sendMessage(msg.chat.id, `Received your message '${msg.text}'`);
});
// Start and Stop bot functions
const startBot = () => {
    if (!EXIT_LOOP) return;
    console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
    EXIT_LOOP = false;
    botLoop();
};
const stopBot = () => {
    if (EXIT_LOOP) return;
    console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
    EXIT_LOOP = true;
};

// Utility to wait
const wait = async ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper to validate response/error data
const isValidData = (ohlcv) => {
    return !(ohlcv instanceof Error || !Array.isArray(ohlcv) || ohlcv.length === 0);
};

// Fetch data and process pair  
const processPair = async (pair) => {
    const joinedPair = pair.split("_").join('');
    const ohlcv = await klines(joinedPair, '2h');

    if (!isValidData(ohlcv)) {
        console.error(`Failed to fetch data for ${pair}`);
        console.error(`Error or invalid data:`, ohlcv);
        return null;
    }

    try {
        const indicators = getIndicators(ohlcv);
        const trend = analyzeCandles(ohlcv, 12);
        const signal = shouldBuyOrSell(indicators);
        const result = {
            pair,
            indicators,
            trend,
            signal,
            date: Intl.DateTimeFormat("es", { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
        };
        PAIRS_DATA[pair] = result;

        return result;
    } catch (error) {
        console.error(`Error processing ${pair}:`, error);
        return null;
    }
};

// Bot loop function
const botLoop = async () => {
    while (!EXIT_LOOP) {
        const promiseArray = PAIRS[PAIRS_LOOP_INDEX].map(pair => processPair(pair));
        const results = await Promise.all(promiseArray);
        
        const tableRowsArray = results.filter(result => result !== null);
        printTable(tableRowsArray);

        if (SAVE_DATA) saveData(PAIRS_DATA, 'final_data.json');
        
        PAIRS_LOOP_INDEX = (PAIRS_LOOP_INDEX + 1) % PAIRS.length;
        await wait(DELAY);
    }
};

// Print table of results
const printTable = (dataArray) => {
    const p = new Table({
        columns: [
            { name: 'pair', alignment: 'left', color: 'blue' },
            { name: 'rsi', title: 'RSI', color: 'yellow' },
            { name: 'stoch_rsi', title: 'Stoch RSI', color: 'yellow' },
            { name: 'macd', title: 'MACD', color: 'yellow' },
            { name: 'adx', title: 'ADX', color: 'yellow' },
            { name: 'ao', title: 'AO', color: 'yellow' },
            { name: 'atr', title: 'ATR', color: 'yellow' },
            { name: 'ema', title: 'EMA', color: 'custom_green' },
            { name: 'priceTrend', title: 'Price Trend' },
            { name: 'volumeTrend', title: 'Volume Trend' },
            { name: 'signal', title: 'Signal' },
            { name: 'date', title: 'Date', alignment: 'center', color: 'blue' }
        ],
        colorMap: {
            custom_green: '\x1b[32m',
        },
    });
    
    dataArray.forEach(element => {
        p.addRow({
            pair: element.pair,
            rsi: element.indicators?.CURRENT_RSI.toFixed(2),
            stoch_rsi: element.indicators?.CURRENT_STOCH_RSI?.k?.toFixed(2),
            macd: element.indicators?.CURRENT_MACD?.histogram.toFixed(4),
            adx: element.indicators?.CURRENT_ADX?.adx.toFixed(4),
            ao: element.indicators?.CURRENT_AO,
            atr: element.indicators?.CURRENT_ATR.toFixed(4),
            ema: element.indicators?.CURRENT_EMA.toFixed(6),
            priceTrend: element.trend?.priceTrend,
            volumeTrend: element.trend?.volumeTrend,
            signal: element.signal,
            date: element.date
        }, {
            color: element.trend?.priceTrend == 'Bullish' || element.signal == 'Buy' ? 'green' :
                   element.trend?.priceTrend == 'Bearish' || element.signal == 'Sell' ? 'red' : ''
        });
    });
    p.printTable();
};

// Start the bot
startBot();


*/



require('dotenv').config(); // env config
const { klines } = require('../scripts/binance-spot-2.js');
const { Table } = require('console-table-printer');
const { getIndicators } = require('../scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('../scripts/trendCalcs.js');
const { saveData } = require('../utils/fileManager.js');

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const tBot = new TelegramBot(token, { polling: true });
const SAVE_DATA = false;

let EXIT_LOOP = true;
const DELAY = 5000;
let PAIRS_LOOP_INDEX = 0;

const PAIRS = [
    ['BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'FET_USDT', 'FTM_USDT', 'FIO_USDT'],
    ['ICP_USDT', 'COTI_USDT', 'KP3R_USDT', 'AVAX_USDT', 'LINK_USDT', 'MATIC_USDT'],
    ['FLOKI_USDT', 'PEPE_USDT', 'WIF_USDT', 'BONK_USDT', 'PEOPLE_USDT', 'TURBO_USDT'],
    ['SOL_USDT', '1INCH_USDT', 'ARKM_USDT', 'BURGER_USDT', 'BLZ_USDT', 'DOGS_USDT']
];
let PAIRS_DATA = {};

// Telegram Bot message handling
tBot.on('message', (msg) => {
    if (msg.from.id == process.env.TELEGRAM_MY_ID) {
        if (msg.text == 'start') { startBot(); }
        if (msg.text == 'stop') { stopBot(); }
    }
    tBot.sendMessage(msg.chat.id, `Received your message '${msg.text}'`);
});

// Start and Stop bot functions
const startBot = () => {
    if (!EXIT_LOOP) return;
    console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
    EXIT_LOOP = false;
    botLoop();
};
const stopBot = () => {
    if (EXIT_LOOP) return;
    console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
    EXIT_LOOP = true;
};

// Utility to wait
const wait = async ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper to validate response/error data
const isValidData = (ohlcv) => {
    return !(ohlcv instanceof Error || !Array.isArray(ohlcv) || ohlcv.length === 0);
};

// Fetch data and process pair  
const processPair = async (pair) => {
    const joinedPair = pair.split("_").join('');
    const ohlcv = await klines(joinedPair, '2h');

    if (!isValidData(ohlcv)) {
        console.error(`Failed to fetch data for ${pair}`);
        console.error(`Error or invalid data:`, ohlcv);
        return null;
    }

    try {
        const indicators = getIndicators(ohlcv);
        const trend = analyzeCandles(ohlcv, 12);
        const signal = shouldBuyOrSell(indicators);
        const result = {
            pair,
            indicators,
            trend,
            signal,
            date: Intl.DateTimeFormat("es", { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
        };
        PAIRS_DATA[pair] = result;
        // if (signal == 'Buy' ) {
        //     console.log('Buy Signal Triggered!', pair);
        //     if(BUY_ALERT_CONFIG) tBot.sendMessage(GROUP_CHAT_ID, Should buy https://www.binance.com/en/trade/${pair}?type=spot, { parse_mode: "HTML", disable_web_page_preview: true });// this is why we mantian the pair with the underscore _
        // } else if (signal == 'Sell') {
        //     console.log('Sell Signal Triggered!', pair);
        //     if(SELL_ALERT_CONFIG) tBot.sendMessage(GROUP_CHAT_ID, Should sell https://www.binance.com/en/trade/${pair}?type=spot, { parse_mode: "HTML", disable_web_page_preview: true });// this is why we mantian the pair with the underscore _
        // } else {
        //     //console.log('No trade signal.');
        // } 
        return result;
    } catch (error) {
        console.error(`Error processing ${pair}:`, error);
        return null;
    }
};

// Bot loop function
const botLoop = async () => {
    while (!EXIT_LOOP) {
        const promiseArray = PAIRS[PAIRS_LOOP_INDEX].map(pair => processPair(pair));
        const results = await Promise.all(promiseArray);
        
        const tableRowsArray = results.filter(result => result !== null);
        printTable(tableRowsArray);

        if (SAVE_DATA) saveData(PAIRS_DATA, 'final_data.json');
        PAIRS_LOOP_INDEX = (PAIRS_LOOP_INDEX + 1) % PAIRS.length;
        // PAIRS_LOOP_INDEX++;
        // if (PAIRS_LOOP_INDEX >= PAIRS.length) {
        //     PAIRS_LOOP_INDEX = 0; 
        //     console.log('\x1b[33m%s\x1b[0m', '<<------------------------>>'); // Log after all pairs have been processed
        // } 
        await wait(DELAY);
    }
};

// Print table of results
const printTable = (dataArray) => {
    const p = new Table({
        columns: [
            { name: 'pair', alignment: 'left', color: 'blue' },
            { name: 'rsi', title: 'RSI', color: 'yellow' },
            { name: 'stoch_rsi', title: 'Stoch RSI', color: 'yellow' },
            { name: 'macd', title: 'MACD', color: 'yellow' },
            { name: 'adx', title: 'ADX', color: 'yellow' },
            { name: 'ao', title: 'AO', color: 'yellow' },
            { name: 'atr', title: 'ATR', color: 'yellow' },
            { name: 'ema', title: 'EMA', color: 'custom_green' },
            { name: 'priceTrend', title: 'Price Trend' },
            { name: 'volumeTrend', title: 'Volume Trend' },
            { name: 'signal', title: 'Signal' },
            { name: 'date', title: 'Date', alignment: 'center', color: 'blue' }
        ],
        colorMap: {
            custom_green: '\x1b[32m',
        },
    });
    
    dataArray.forEach(element => {
        p.addRow({
            pair: element.pair,
            rsi: element.indicators?.CURRENT_RSI.toFixed(2),
            stoch_rsi: element.indicators?.CURRENT_STOCH_RSI?.k?.toFixed(2),
            macd: element.indicators?.CURRENT_MACD?.histogram.toFixed(4),
            adx: element.indicators?.CURRENT_ADX?.adx.toFixed(4),
            ao: element.indicators?.CURRENT_AO,
            atr: element.indicators?.CURRENT_ATR.toFixed(4),
            ema: element.indicators?.CURRENT_EMA.toFixed(6),
            priceTrend: element.trend?.priceTrend,
            volumeTrend: element.trend?.volumeTrend,
            signal: element.signal,
            date: element.date
        }, {
            color: element.trend?.priceTrend == 'Bullish' || element.signal == 'Buy' ? 'green' :
                   element.trend?.priceTrend == 'Bearish' || element.signal == 'Sell' ? 'red' : ''
        });
    });
    p.printTable();
};

// Start the bot
startBot();
/*
const { klines } = require('./scripts/binance-spot.js');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');

// Flatten the PAIRS array
const ALL_PAIRS = PAIRS.flat();

// Queue system
class Queue {
    constructor(concurrency = 5) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    enqueue(fn) {
        this.queue.push(fn);
        this.dequeue();
    }

    dequeue() {
        if (this.running >= this.concurrency) return;

        const item = this.queue.shift();
        if (!item) return;

        this.running++;
        item(() => {
            this.running--;
            this.dequeue();
        });
    }
}

// Process a single pair
const processPair = async (pair) => {
    const joinedPair = pair.split("_").join('');
    const ohlcv = await klines(joinedPair, '2h');

    if (!isValidData(ohlcv)) {
        console.error(`Failed to fetch data for ${pair}`);
        console.error(`Error or invalid data:`, ohlcv);
        return null;
    }

    try {
        const indicators = getIndicators(ohlcv);
        const trend = analyzeCandles(ohlcv, 12);
        const signal = shouldBuyOrSell(indicators);
        return {
            pair,
            indicators,
            trend,
            signal,
            date: Intl.DateTimeFormat("es", { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
        };
    } catch (error) {
        console.error(`Error processing ${pair}:`, error);
        return null;
    }
};

// Bot loop function
const botLoop = async () => {
    const queue = new Queue(5); // Process 5 pairs concurrently
    let results = [];

    const processAllPairs = () => {
        return new Promise((resolve) => {
            let completed = 0;

            ALL_PAIRS.forEach((pair) => {
                queue.enqueue(async (done) => {
                    const result = await processPair(pair);
                    if (result) {
                        results.push(result);
                        PAIRS_DATA[pair] = result;
                    }
                    completed++;
                    if (completed === ALL_PAIRS.length) resolve();
                    done();
                });
            });
        });
    };

    while (!EXIT_LOOP) {
        await processAllPairs();
        
        printTable(results);
        if (SAVE_DATA) saveData(PAIRS_DATA, 'final_data.json');
        
        results = []; // Clear results for next iteration
        await wait(DELAY);
    }
};

// Start the bot
startBot();

*/




/*


const { klines } = require('./scripts/binance-spot.js');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');

// Flatten the PAIRS array
const ALL_PAIRS = PAIRS.flat();

// RateLimiter class
class RateLimiter {
    constructor(rateLimit, burstLimit) {
        this.rateLimit = rateLimit;
        this.burstLimit = burstLimit;
        this.tokens = burstLimit;
        this.lastRefill = Date.now();
    }

    async waitForToken() {
        while (true) {
            this.refillTokens();
            if (this.tokens > 0) {
                this.tokens--;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms before checking again
        }
    }

    refillTokens() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const refillAmount = (timePassed / 1000) * (this.rateLimit / 60);
        this.tokens = Math.min(this.burstLimit, this.tokens + refillAmount);
        this.lastRefill = now;
    }
}

// Queue system with rate limiting
class Queue {
    constructor(rateLimiter) {
        this.rateLimiter = rateLimiter;
        this.queue = [];
        this.running = 0;
    }

    enqueue(fn) {
        this.queue.push(fn);
        this.dequeue();
    }

    async dequeue() {
        if (this.running >= 20) return; // Max concurrent requests

        const item = this.queue.shift();
        if (!item) return;

        this.running++;
        await this.rateLimiter.waitForToken();
        item(async () => {
            this.running--;
            this.dequeue();
        });
    }
}

// Process a single pair
const processPair = async (pair) => {
    const joinedPair = pair.split("_").join('');
    const ohlcv = await klines(joinedPair, '2h');

    if (!isValidData(ohlcv)) {
        console.error(`Failed to fetch data for ${pair}`);
        console.error(`Error or invalid data:`, ohlcv);
        return null;
    }

    try {
        const indicators = getIndicators(ohlcv);
        const trend = analyzeCandles(ohlcv, 12);
        const signal = shouldBuyOrSell(indicators);
        return {
            pair,
            indicators,
            trend,
            signal,
            date: Intl.DateTimeFormat("es", { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
        };
    } catch (error) {
        console.error(`Error processing ${pair}:`, error);
        return null;
    }
};

// Bot loop function
const botLoop = async () => {
    const rateLimiter = new RateLimiter(1100, 1800); // Slightly under the limit for safety
    const queue = new Queue(rateLimiter);
    let results = [];

    const processAllPairs = () => {
        return new Promise((resolve) => {
            let completed = 0;

            ALL_PAIRS.forEach((pair) => {
                queue.enqueue(async (done) => {
                    const result = await processPair(pair);
                    if (result) {
                        results.push(result);
                        PAIRS_DATA[pair] = result;
                    }
                    completed++;
                    if (completed === ALL_PAIRS.length) resolve();
                    done();
                });
            });
        });
    };

    while (!EXIT_LOOP) {
        console.time('Processing round');
        await processAllPairs();
        console.timeEnd('Processing round');
        
        printTable(results);
        if (SAVE_DATA) saveData(PAIRS_DATA, 'final_data.json');
        
        results = []; // Clear results for next iteration
        await wait(DELAY);
    }
};

// Start the bot
startBot();


*/






/*

require('dotenv').config(); // env config
const { klines } = require('./scripts/binance-spot.js');
const { Table } = require('console-table-printer');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const tBot = new TelegramBot(token, { polling: true });
const SAVE_DATA = false;

let EXIT_LOOP = true;
const DELAY = 4000;

const ALL_PAIRS = [
    'BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'FET_USDT', 'FTM_USDT', 'FIO_USDT',
    'ICP_USDT', 'COTI_USDT', 'KP3R_USDT', 'AVAX_USDT', 'LINK_USDT', 'MATIC_USDT',
    'FLOKI_USDT', 'PEPE_USDT', 'WIF_USDT', 'BONK_USDT', 'PEOPLE_USDT', 'TURBO_USDT',
    'SOL_USDT', '1INCH_USDT', 'ARKM_USDT', 'BURGER_USDT', 'BLZ_USDT', 'DOGS_USDT'
];
let PAIRS_DATA = {};


class RateLimitedQueue {
    constructor(rateLimit, burstLimit, maxConcurrent = 20) {
        this.rateLimit = rateLimit;
        this.burstLimit = burstLimit;
        this.maxConcurrent = maxConcurrent;
        this.tokens = burstLimit;
        this.lastRefill = Date.now();
        this.queue = [];
        this.running = 0;
    }

    refillTokens() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const refillAmount = (timePassed / 1000) * (this.rateLimit / 60);
        this.tokens = Math.min(this.burstLimit, this.tokens + refillAmount);
        this.lastRefill = now;
    }

    async waitForToken() {
        while (true) {
            this.refillTokens();
            if (this.tokens > 0) {
                this.tokens--;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    enqueue(fn) {
        this.queue.push(fn);
        this.dequeue();
    }

    async dequeue() {
        if (this.running >= this.maxConcurrent) return;

        const item = this.queue.shift();
        if (!item) return;

        this.running++;
        await this.waitForToken();
        item(async () => {
            this.running--;
            this.dequeue();
        });
    }
}

// Telegram Bot message handling
tBot.on('message', (msg) => {
    if (msg.from.id == process.env.TELEGRAM_MY_ID) {
        if (msg.text == 'start') { startBot(); }
        if (msg.text == 'stop') { stopBot(); }
    }
    tBot.sendMessage(msg.chat.id, `Received your message '${msg.text}'`);
});
// Start and Stop bot functions
const startBot = () => {
    if (!EXIT_LOOP) return;
    console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
    EXIT_LOOP = false;
    botLoop();
};
const stopBot = () => {
    if (EXIT_LOOP) return;
    console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
    EXIT_LOOP = true;
};

// Utility to wait
const wait = async ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper to validate response/error data
const isValidData = (ohlcv) => {
    return !(ohlcv instanceof Error || !Array.isArray(ohlcv) || ohlcv.length === 0);
};

// Fetch data and process pair  
const processPair = async (pair) => {
    const joinedPair = pair.split("_").join('');
    const ohlcv = await klines(joinedPair, '2h');

    if (!isValidData(ohlcv)) {
        console.error(`Failed to fetch data for ${pair}`);
        console.error(`Error or invalid data:`, ohlcv);
        return null;
    }

    try {
        const indicators = getIndicators(ohlcv);
        const trend = analyzeCandles(ohlcv, 12);
        const signal = shouldBuyOrSell(indicators);
        const result = {
            pair,
            indicators,
            trend,
            signal,
            date: Intl.DateTimeFormat("es", { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
        };
        PAIRS_DATA[pair] = result;

        return result;
    } catch (error) {
        console.error(`Error processing ${pair}:`, error);
        return null;
    }
};

const processAllPairs = (queue) => {
    return new Promise((resolve) => {
        let completed = 0;
        const results = [];

        ALL_PAIRS.forEach((pair) => {
            queue.enqueue(async (done) => {
                const result = await processPair(pair);
                if (result) {
                    results.push(result);
                    PAIRS_DATA[pair] = result;
                }
                completed++;
                if (completed === ALL_PAIRS.length) resolve(results);
                done();
            });
        });
    });
};

// Bot loop function
const botLoop = async () => {
    const queue = new RateLimitedQueue(1100, 1800, 20);
    while (!EXIT_LOOP) {
        console.time('Processing round');
        const results = await processAllPairs(queue);
        console.timeEnd('Processing round');
        
        printTable(results);
        if (SAVE_DATA) saveData(PAIRS_DATA, 'final_data.json');
        await wait(DELAY);
    }
};

// Print table of results
const printTable = (dataArray) => {
    const p = new Table({
        columns: [
            { name: 'pair', alignment: 'left', color: 'blue' },
            { name: 'rsi', title: 'RSI', color: 'yellow' },
            { name: 'stoch_rsi', title: 'Stoch RSI', color: 'yellow' },
            { name: 'macd', title: 'MACD', color: 'yellow' },
            { name: 'adx', title: 'ADX', color: 'yellow' },
            { name: 'ao', title: 'AO', color: 'yellow' },
            { name: 'atr', title: 'ATR', color: 'yellow' },
            { name: 'ema', title: 'EMA', color: 'custom_green' },
            { name: 'priceTrend', title: 'Price Trend' },
            { name: 'volumeTrend', title: 'Volume Trend' },
            { name: 'signal', title: 'Signal' },
            { name: 'date', title: 'Date', alignment: 'center', color: 'blue' }
        ],
        colorMap: {
            custom_green: '\x1b[32m',
        },
    });
    
    dataArray.forEach(element => {
        p.addRow({
            pair: element.pair,
            rsi: element.indicators?.CURRENT_RSI.toFixed(2),
            stoch_rsi: element.indicators?.CURRENT_STOCH_RSI?.k?.toFixed(2),
            macd: element.indicators?.CURRENT_MACD?.histogram.toFixed(4),
            adx: element.indicators?.CURRENT_ADX?.adx.toFixed(4),
            ao: element.indicators?.CURRENT_AO,
            atr: element.indicators?.CURRENT_ATR.toFixed(4),
            ema: element.indicators?.CURRENT_EMA.toFixed(6),
            priceTrend: element.trend?.priceTrend,
            volumeTrend: element.trend?.volumeTrend,
            signal: element.signal,
            date: element.date
        }, {
            color: element.trend?.priceTrend == 'Bullish' || element.signal == 'Buy' ? 'green' :
                   element.trend?.priceTrend == 'Bearish' || element.signal == 'Sell' ? 'red' : ''
        });
    });
    p.printTable();
};

// Start the bot
startBot();


*/



const analyzeCandles = (candles, analysisWindow = candles.length) => {
    if (candles.length < 2) {
      return {
        status: "Insufficient data",
        description: "Need at least 2 candles for analysis"
      };
    }
    // Analyze only the last 'analysisWindow' candles (e.g., 12 for 24 hours)
    const candlesToAnalyze = candles.slice(-analysisWindow);
    const extractNumber = (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };
  
    const priceChanges = candlesToAnalyze.map((candle, index) => {
      if (index === 0) return 0;// ignore as we need previous candle to compare, and 0 index has none
      const prevClose = extractNumber(candlesToAnalyze[index - 1][4]);  // Previous Close (index 4)
      const currentClose = extractNumber(candle[4]);                     // Current Close (index 4)
      return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
    }).slice(1);
  
    const volumeChanges = candlesToAnalyze.map((candle, index) => {
      if (index === 0) return 0;// ignore as we need previous candle to compare, and 0 index has none
      const prevVolume = extractNumber(candlesToAnalyze[index - 1][5]);  // Previous Volume (index 5)
      const currentVolume = extractNumber(candle[5]);                    // Current Volume (index 5)
      return prevVolume === 0 ? 0 : ((currentVolume - prevVolume) / prevVolume) * 100;
    }).slice(1);
  
    const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
  
    const lastCandle = candlesToAnalyze[candlesToAnalyze.length - 1];
    const firstCandle = candlesToAnalyze[0];
  
    const overallPriceChange = ((extractNumber(lastCandle[4]) - extractNumber(firstCandle[1])) / extractNumber(firstCandle[1])) * 100;  // First Open (index 1) to Last Close (index 4)
    const overallVolumeChange = ((extractNumber(lastCandle[5]) - extractNumber(firstCandle[5])) / extractNumber(firstCandle[5])) * 100;  // First Volume (index 5) to Last Volume (index 5)
  
    const highestPrice = Math.max(...candlesToAnalyze.map(candle => extractNumber(candle[2])));  // High (index 2)
    const lowestPrice = Math.min(...candlesToAnalyze.map(candle => extractNumber(candle[3])));   // Low (index 3)
  
    let priceTrend, volumeTrend;
  
    if (avgPriceChange > 0.5) priceTrend = "Bullish";
    else if (avgPriceChange < -0.5) priceTrend = "Bearish";
    else priceTrend = "Sideways";
  
    if (avgVolumeChange > 5) volumeTrend = "Increasing";
    else if (avgVolumeChange < -5) volumeTrend = "Decreasing";
    else volumeTrend = "Stable";
  
    return {
      priceTrend,
      volumeTrend,
      avgPriceChange: avgPriceChange.toFixed(2) + "%",
      avgVolumeChange: avgVolumeChange.toFixed(2) + "%",
      overallPriceChange: overallPriceChange.toFixed(2) + "%",
      overallVolumeChange: overallVolumeChange.toFixed(2) + "%",
      highestPrice: highestPrice.toFixed(2),
      lowestPrice: lowestPrice.toFixed(2),
      summary: `The market is showing a ${priceTrend.toLowerCase()} price trend with ${volumeTrend.toLowerCase()} volume. ` +
        `Average price change: ${avgPriceChange.toFixed(2)}%, Average volume change: ${avgVolumeChange.toFixed(2)}%. ` +
        `Overall price movement: ${overallPriceChange.toFixed(2)}%, Overall volume change: ${overallVolumeChange.toFixed(2)}%.`
    };
  };
  
  const shouldBuyOrSell = (indicators) => {
      // Thresholds
      const RSI_BUY_LIMIT = 40; // Raised to be less strict
      const RSI_SELL_LIMIT = 60; // Relaxed sell threshold
      const STOCH_BUY_LIMIT = 40; // Raised from 30
      const STOCH_SELL_LIMIT = 60; // Raised from 70
      const MACD_BUY_LIMIT = 0;    // Unchanged
      const MACD_SELL_LIMIT = 0;   // Unchanged
      //const ADX_TREND_LIMIT = 20;  // ADX limit indicating trend strength
      const ATR_THRESHOLD = 0.5; // Adjust this based on what is considered high volatility for your market
      const CONDITIONS_NEEDED = 3; //2
      
      // Relaxed indicator conditions
      const macdCrossUp = (indicators.macd && indicators.macd.length > 1) 
          ? indicators.macd[indicators.macd.length - 1].histogram > MACD_BUY_LIMIT && 
            indicators.macd[indicators.macd.length - 2].histogram <= MACD_BUY_LIMIT 
          : false;
  
      const macdCrossDown = (indicators.macd && indicators.macd.length > 1) 
          ? indicators.macd[indicators.macd.length - 1].histogram < MACD_SELL_LIMIT && 
            indicators.macd[indicators.macd.length - 2].histogram >= MACD_SELL_LIMIT 
          : false;
  
      const stochRSIOverselled = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) 
          ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k < STOCH_BUY_LIMIT 
          : false;
  
      const stochRSIOverbought = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) 
          ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_SELL_LIMIT 
          : false;
  
      const rsiOK = (indicators.rsi && indicators.rsi.length > 0) 
          ? indicators.rsi[indicators.rsi.length - 1] < RSI_BUY_LIMIT 
          : false;
  
      const rsiOverbought = (indicators.rsi && indicators.rsi.length > 0) 
          ? indicators.rsi[indicators.rsi.length - 1] > RSI_SELL_LIMIT 
          : false;
  
      const aoPositive = (indicators.ao && indicators.ao.length > 0) 
          ? indicators.ao[indicators.ao.length - 1] > 0 
          : false;
  
      const aoNegative = (indicators.ao && indicators.ao.length > 0) 
          ? indicators.ao[indicators.ao.length - 1] < 0 
          : false;
  
      // const adxStrong = (indicators.adx && indicators.adx.length > 0) 
      //     ? indicators.adx[indicators.adx.length - 1].adx > ADX_TREND_LIMIT 
      //     : false;
  
      // const emaCrossUp = (indicators.ema && indicators.ema.length > 1) 
      //     ? indicators.ema[indicators.ema.length - 1].shortEMA > indicators.ema[indicators.ema.length - 1].longEMA 
      //     : false;
  
      // const emaCrossDown = (indicators.ema && indicators.ema.length > 1) 
      //     ? indicators.ema[indicators.ema.length - 1].shortEMA < indicators.ema[indicators.ema.length - 1].longEMA 
      //     : false;
  
      const atrIncreasing = (indicators.atr && indicators.atr.length > 1) 
          ? indicators.atr[indicators.atr.length - 1] > indicators.atr[indicators.atr.length - 2] 
          : false; //buy when volatility is high
      // Volatility threshold (ATR): If ATR has increased significantly, we might use it as a confirmation of buy/sell.
      
      const highVolatility = (indicators.atr && indicators.atr.length > 0)
        ? indicators.atr[indicators.atr.length - 1] > ATR_THRESHOLD
        : false;
  
      // Scoring system for buy or sell signals
      let buyScore = 0;
      let sellScore = 0;
  
      // Assign weights to each indicator
      if (macdCrossUp) buyScore += 2;  // Stronger signal
      if (stochRSIOverselled) buyScore += 1;   // Weaker signal
      if (rsiOK) buyScore += 1;
      if (aoPositive) buyScore += 1;
      if (atrIncreasing) buyScore += 1;
      //if (adxStrong && emaCrossUp) buyScore += 2;  // Stronger signal
  
      // Sell conditions
      if (macdCrossDown) sellScore++;
      if (stochRSIOverbought) sellScore++;
      if (rsiOverbought) sellScore++;
      if (aoNegative) sellScore++;
      //if (adxStrong && emaCrossDown) sellScore++;
  
      // Flexibility: Only 2 or more conditions need to be met for a buy or sell signal
      if (buyScore >= CONDITIONS_NEEDED && highVolatility) {
          return "Buy";
      } else if (sellScore >= CONDITIONS_NEEDED && highVolatility) {
          return "Sell";
      } else {
          return "Hold";
      }
  };
  
  
  module.exports = { analyzeCandles, shouldBuyOrSell };
  
  
  /*
  
    async sendAlert(pair, signal) {
        const normalizedSignal = signal.toLowerCase();
        if (!['buy', 'sell'].includes(normalizedSignal)) return;
    
        const currentTime = Date.now();
        const lastAlertTime = this.lastAlertTimes[normalizedSignal]?.[pair] || 0;
    
        if (currentTime - lastAlertTime >= this.config.alertCooldown) {
            await this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `${signal} signal for ${pair}`);
            this.lastAlertTimes[normalizedSignal] = { 
                ...this.lastAlertTimes[normalizedSignal], 
                [pair]: currentTime 
            };
        }
    }
  */