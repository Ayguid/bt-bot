const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail, klines} = require('./scripts/binance-spot-2.js');


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
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { klines, fetchMyOrders } = require('./utils/binance-spot.js');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');
const RateLimitedQueue = require('./classes/RateLimitedQueue.js');
const TablePrinter = require('./utils/tablePrinter.js');
const config = require('./config.js');

class TradingBot {
    constructor() {
        this.config = config;
        this.pairsFile = path.join(__dirname, 'pairs.json');
        this.pairsData = {};
        this.orders = {};
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter();
        this.lastAlertTimes = { buy: {}, sell: {} };
        this.isRunning = false;
    }

    async initialize() {
        await this.loadPairsFromFile();
        this.initializeTelegramBot();
    }

    async loadPairsFromFile() {
        try {
            const data = await fs.readFile(this.pairsFile, 'utf8');
            const parsedData = JSON.parse(data);
            this.allPairs = parsedData.pairs || [];
            this.tradeablePairs = parsedData.tradeablePairs || [];
        } catch (error) {
            console.error('Error reading pairs file, using default pairs:', error);
            this.allPairs = ['BTC_USDT', 'ETH_USDT'];
            this.tradeablePairs = [];
        }
    }

    async savePairsToFile() {
        try {
            const data = JSON.stringify({ pairs: this.allPairs, tradeablePairs: this.tradeablePairs }, null, 2);
            await fs.writeFile(this.pairsFile, data);
        } catch (error) {
            console.error('Error saving pairs to file:', error);
        }
    }

    initializeTelegramBot() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.tBot = new TelegramBot(token, { polling: true });
        this.tBot.on('message', this.handleTelegramMessage.bind(this));
    }

    async handleTelegramMessage(msg) {
        if (msg.from.id !== Number(process.env.TELEGRAM_MY_ID)) return;

        await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, `Received your message '${msg.text}'`);

        const [command, ...args] = msg.text.split(' ');
        const response = await this.executeCommand(command, args);

        await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, response);
    }

    async executeCommand(command, args) {
        const commands = {
            start: () => this.startBot(),
            stop: () => this.stopBot(),
            addPair: () => this.addRemovePair(args[0], true, false),
            removePair: () => this.addRemovePair(args[0], false, false),
            addTpair: () => this.addRemovePair(args[0], true, true),
            removeTpair: () => this.addRemovePair(args[0], false, true),
        };

        const action = commands[command];
        return action ? await action() : 'Unknown command.';
    }

    addRemovePair(pair, isAdd, isTradeable) {
        const targetArray = isTradeable ? this.tradeablePairs : this.allPairs;
        const otherArray = isTradeable ? this.allPairs : this.tradeablePairs;

        if (isAdd) {
            if (isTradeable && !otherArray.includes(pair)) {
                return `Cannot add ${pair} to tradeable pairs. It is not in the all pairs list.`;
            }
            if (!targetArray.includes(pair)) {
                targetArray.push(pair);
                this.savePairsToFile();
                return `Added ${pair} to ${isTradeable ? 'tradeable' : 'all'} pairs.`;
            }
            return `${pair} already exists in ${isTradeable ? 'tradeable' : 'all'} pairs.`;
        } else {
            const index = targetArray.indexOf(pair);
            if (index !== -1) {
                targetArray.splice(index, 1);
                this.savePairsToFile();
                return `Removed ${pair} from ${isTradeable ? 'tradeable' : 'all'} pairs.`;
            }
            return `${pair} not found in ${isTradeable ? 'tradeable' : 'all'} pairs.`;
        }
    }

    async sendAlert(pair, signal) {
        const currentTime = Date.now();
        const lastAlertTime = this.lastAlertTimes[signal.toLowerCase()][pair] || 0;
        
        if (currentTime - lastAlertTime >= this.config.alertCooldown) {
            await this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `${signal} signal for ${pair}`);
            this.lastAlertTimes[signal.toLowerCase()][pair] = currentTime;
        }
    }

    startBot() {
        if (this.isRunning) return 'Bot is already running.';
        this.isRunning = true;
        this.botLoop();
        return 'Bot started.';
    }

    stopBot() {
        if (!this.isRunning) return 'Bot is already stopped.';
        this.isRunning = false;
        return 'Bot stopped.';
    }

    async processPair(pair) {
        const joinedPair = pair.replace('_', '');

        try {
            //Sequential execution,,, takes almost 6 secs more
            //const ohlcv = await this.makeQueuedReq(joinedPair, '2h', klines);
            //const orders = await this.makeQueuedReq(joinedPair, false, fetchMyOrders);
            //Initiated concurrently,,, 6 secs less approx
            const [ohlcv, orders] = await Promise.all([
                this.makeQueuedReq(joinedPair, '2h', klines),
                this.makeQueuedReq(joinedPair, false, fetchMyOrders)
            ]);

            if (!Array.isArray(ohlcv) || ohlcv.length === 0) {
                throw new Error('Invalid OHLCV data');
            }

            this.orders[pair] = orders;

            const indicators = getIndicators(ohlcv);
            const trend = analyzeCandles(ohlcv, 12);
            const signal = shouldBuyOrSell(indicators, ohlcv);

            await this.sendAlert(pair, signal);

            if ((signal === 'Buy' || signal === 'Sell') && this.tradeablePairs.includes(pair)) {
                console.log(`Placing order for ${pair} with signal: ${signal}`);
                // Implement order placement logic here
            }

            return {
                pair,
                indicators,
                trend,
                signal,
                date: new Date().toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
            };
        } catch (error) {
            console.error(`Error processing ${pair}:`, error);
            return null;
        }
    }

    makeQueuedReq(pair, option, apiFunction) {
        return new Promise((resolve, reject) => {
            this.queue.enqueue(async (done) => {
                try {
                    const result = await apiFunction(pair, option);
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    done();
                }
            });
        });
    }

    async processAllPairs() {
        const results = await Promise.all(
            this.allPairs.map(pair => this.processPair(pair))
        );

        results.forEach(result => {
            if (result) {
                this.pairsData[result.pair] = result;
            }
        });

        return results.filter(Boolean);
    }

    async botLoop() {
        while (this.isRunning) {
            console.time('Processing round');
            const results = await this.processAllPairs();
            console.timeEnd('Processing round');

            this.tablePrinter.print(results);
            if (this.config.saveData) await saveData(this.pairsData, 'final_data.json');
            await new Promise(resolve => setTimeout(resolve, this.config.delay));
        }
    }
}

// Usage
async function main() {
    const bot = new TradingBot();
    await bot.initialize();
    bot.startBot();
}

main().catch(console.error);