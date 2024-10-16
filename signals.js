require('dotenv').config();
const { klines } = require('./scripts/binance-spot.js');
const { Table } = require('console-table-printer');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');
const TelegramBot = require('node-telegram-bot-api');
const RateLimitedQueue = require('./classes/RateLimitedQueue.js');

class TradingBot {
    constructor() {
        this.EXIT_LOOP = true;
        this.DELAY = 4000;
        this.SAVE_DATA = false;
        this.ALL_PAIRS = [
            'BTC_USDT', 'ETH_USDT', 'FET_USDT', 'BNB_USDT', 'FTM_USDT', 'FIO_USDT',
            'ICP_USDT', 'COTI_USDT', 'KP3R_USDT', 'AVAX_USDT', 'LINK_USDT', 'MATIC_USDT',
            'FLOKI_USDT', 'PEPE_USDT', 'WIF_USDT', 'BONK_USDT', 'PEOPLE_USDT', 'TURBO_USDT',
            'SOL_USDT', '1INCH_USDT', 'ARKM_USDT', 'BURGER_USDT', 'BLZ_USDT', 'DOGS_USDT'
        ];
        this.PAIRS_DATA = {};
        this.QUEUE = new RateLimitedQueue(1100, 1800, 20);
        this.initializeTelegramBot();
        // Object to track last alert times for each pair
        this.LAST_ALERT_TIMES = {
            buy: {},
            sell: {}
        };
        this.ALERT_COOLDOWN = 10 * 60 * 1000; // 10 minutes in milliseconds
    }

    initializeTelegramBot() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.tBot = new TelegramBot(token, { polling: true });
        this.tBot.on('message', this.handleTelegramMessage.bind(this));
    }

    handleTelegramMessage(msg) {
        if (msg.from.id == process.env.TELEGRAM_MY_ID) {
            if (msg.text == 'start') { this.startBot(); }
            if (msg.text == 'stop') { this.stopBot(); }
        }
        this.tBot.sendMessage(msg.chat.id, `Received your message '${msg.text}'`);
    }

    startBot() {
        if (!this.EXIT_LOOP) return;
        console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
        this.EXIT_LOOP = false;
        this.botLoop();
    }

    stopBot() {
        if (this.EXIT_LOOP) return;
        console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
        this.EXIT_LOOP = true;
    }

    isValidData(ohlcv) {
        return !(ohlcv instanceof Error || !Array.isArray(ohlcv) || ohlcv.length === 0);
    }

    async processPair(pair) {
        const joinedPair = pair.split("_").join('');
        const ohlcv = await klines(joinedPair, '2h');

        if (!this.isValidData(ohlcv)) {
            console.error(`Failed to fetch data for ${pair}`);
            console.error(`Error or invalid data:`, ohlcv);
            return null;
        }

        try {
            const indicators = getIndicators(ohlcv);
            const trend = analyzeCandles(ohlcv, 12);
            const signal = shouldBuyOrSell(indicators, ohlcv);
            // Alert logic
            const currentTime = Date.now();
            const pairBuyLastAlertTime = this.LAST_ALERT_TIMES.buy[pair] || 0;
            const pairSellLastAlertTime = this.LAST_ALERT_TIMES.sell[pair] || 0;

            if (signal === 'Buy' && (currentTime - pairBuyLastAlertTime) >= this.ALERT_COOLDOWN) {
                await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, `Buy signal for ${pair}`);
                this.LAST_ALERT_TIMES.buy[pair] = currentTime; // Update the last alert time for buy
            } else if (signal === 'Sell' && (currentTime - pairSellLastAlertTime) >= this.ALERT_COOLDOWN) {
                await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, `Sell signal for ${pair}`);
                this.LAST_ALERT_TIMES.sell[pair] = currentTime; // Update the last alert time for sell
            }
            // New logic to check balance and create orders
            //const balance = await checkBalance(); // Implement this function
            // if (signal === 'Buy' && balance >= minOrderAmount) {
            //     await createOrder(pair, 'BUY', orderAmount); // Implement this function
            // } else if (signal === 'Sell') {
            //     await createOrder(pair, 'SELL', orderAmount); // Implement this function
            // }
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
    }

    async processAllPairs() {
        const results = new Array(this.ALL_PAIRS.length); // Initialize results array and map the order of the pairs
    
        for (const pair of this.ALL_PAIRS) {
            await new Promise((resolve) => {
                this.QUEUE.enqueue(async (done) => {
                    const result = await this.processPair(pair);
                    if (result) {
                        results[this.ALL_PAIRS.indexOf(pair)] = result; // Use the index to maintain order
                        this.PAIRS_DATA[pair] = result;
                    }
                    resolve();  // Resolve the promise once processing is done
                    done();      // Continue to the next item in the queue
                });
            });
        }
    
        return results; // Return the results in the same order as ALL_PAIRS
    }
    

    printTable(dataArray) {
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
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async botLoop() {
        while (!this.EXIT_LOOP) {
            console.time('Processing round');
            const results = await this.processAllPairs();
            console.timeEnd('Processing round');
            
            this.printTable(results);
            if (this.SAVE_DATA) saveData(this.PAIRS_DATA, 'final_data.json');
            await this.wait(this.DELAY);
        }
    }
}

// Usage
const bot = new TradingBot();
bot.startBot();