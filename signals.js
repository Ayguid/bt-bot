require('dotenv').config();
const { klines, fetchMyOrders } = require('./scripts/binance-spot.js');
const { getIndicators } = require('./scripts/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./scripts/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');
const TelegramBot = require('node-telegram-bot-api');
const RateLimitedQueue = require('./classes/RateLimitedQueue.js');
const fs = require('fs');
const path = require('path');
const TablePrinter = require('./utils/tablePrinter.js');

class TradingBot {
    constructor() {
        this.config = {
            loop: true,
            delay: 4000,
            saveData: false,
            alertCooldown: 10 * 60 * 1000, // 10 minutes in milliseconds
            debug: false,
        };
        
        // Load the allPairs array from the file
        this.pairsFile = path.join(__dirname, 'pairs.json');
        this.allPairs = this.loadPairsFromFile();
        this.pairsData = {};
        this.orders = {};
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter(); // Create an instance of TablePrinter
        this.initializeTelegramBot();
        
        // Object to track last alert times for each pair
        this.lastAlertTimes = {
            buy: {},
            sell: {}
        };
    }

    // Load the pairs from the external file
    loadPairsFromFile() {
        try {
            const data = fs.readFileSync(this.pairsFile);
            const json = JSON.parse(data);
            return json.pairs || [];
        } catch (error) {
            console.error('Error reading pairs file, using default pairs:', error);
            return ['BTC_USDT', 'ETH_USDT']; // Default pairs array if file read fails
        }
    }

    // Save the updated pairs to the external file
    savePairsToFile() {
        try {
            const data = JSON.stringify({ pairs: this.allPairs }, null, 2);
            fs.writeFileSync(this.pairsFile, data);
        } catch (error) {
            console.error('Error saving pairs to file:', error);
        }
    }
    
    addRemovePair(command, isAdd) {
        const pair = command.split(' ')[1];
        if (isAdd) {
            this.allPairs.push(pair);
        } else {
            this.allPairs = this.allPairs.filter(e => e !== pair);
        }
        this.savePairsToFile();
    }

    initializeTelegramBot() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.tBot = new TelegramBot(token, { polling: true });
        this.tBot.on('message', this.handleTelegramMessage.bind(this));
    }

    handleTelegramMessage(msg) {
        if (msg.from.id !== Number(process.env.TELEGRAM_MY_ID)) return;

        const commands = {
            'start': () => this.startBot(),
            'stop': () => this.stopBot(),
            'addPair': () => this.addRemovePair(msg.text, true),
            'removePair': () => this.addRemovePair(msg.text, false),
        };

        const command = commands[msg.text.split(' ')[0]];
        if (command) command();

        this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, `Received your message '${msg.text}'`);
    }

    async sendAlert(pair, signal) {
        const currentTime = Date.now();
        if (signal === 'Buy' && (currentTime - (this.lastAlertTimes.buy[pair] || 0)) >= this.config.alertCooldown) {
            await this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `Buy signal for ${pair}`);
            this.lastAlertTimes.buy[pair] = currentTime;
        } else if (signal === 'Sell' && (currentTime - (this.lastAlertTimes.sell[pair] || 0)) >= this.config.alertCooldown) {
            await this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `Sell signal for ${pair}`);
            this.lastAlertTimes.sell[pair] = currentTime;
        }
    }

    startBot() {
        if (!this.config.loop) return;
        console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
        this.config.loop = false;
        this.botLoop();
    }

    stopBot() {
        if (this.config.loop) return;
        console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
        this.config.loop = true;
    }

    isValidData(ohlcv) {
        return !(ohlcv instanceof Error || !Array.isArray(ohlcv) || ohlcv.length === 0);
    }

    async processPair(pair) {
        const joinedPair = pair.split("_").join('');
        
        // Fetch OHLCV data and orders in parallel
        const ohlcvPromise = this.makeQueuedReq(joinedPair, '2h', klines);
        const ordersPromise = this.makeQueuedReq(joinedPair, false, fetchMyOrders);
        
        // Wait for OHLCV data
        const ohlcv = await ohlcvPromise;

        // Handle OHLCV validation
        if (!this.isValidData(ohlcv)) {
            console.error(`Failed to fetch OHLCV data for ${pair}`);
            if (this.config.debug) console.error(`Error or invalid data:`, ohlcv);
            return null; // Return early if OHLCV is invalid
        }

        // Retrieve orders, even if they fail, we'll still process indicators
        let orders;
        try {
            orders = await ordersPromise; // Await for orders
        } catch (error) {
            console.error(`Failed to fetch orders for ${pair}:`, error);
            orders = []; // Set orders to an empty array if fetching fails
        }
        this.orders[pair] = orders; // Store orders, may be empty

        // Process indicators and send alerts
        try {
            const indicators = getIndicators(ohlcv);
            const trend = analyzeCandles(ohlcv, 12);
            const signal = shouldBuyOrSell(indicators, ohlcv);
            
            // Alert
            await this.sendAlert(pair, signal);
            
            return {
                pair,
                indicators,
                trend,
                signal,
                date: Intl.DateTimeFormat("es", { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
            };
        } catch (error) {
            console.error(`Error processing indicators or signals for ${pair}:`, error);
            return null;
        }
    }

    async makeQueuedReq(pair, option, apiFunction) {
        return new Promise((resolve, reject) => {
            this.queue.enqueue(async (done) => {
                try {
                    const result = await apiFunction(pair, option);
                    done();
                    resolve(result);
                } catch (error) {
                    console.error(`Error executing request for ${pair} with ${option}:`, error);
                    done(); // Always call done to avoid blocking the queue
                    reject(error);
                }
            });
        });
    }

    async processAllPairs() {
        const results = new Array(this.allPairs.length); // Initialize results array to map the order of the pairs
        for (const pair of this.allPairs) {
            const result = await this.processPair(pair);
            if (result) {
                const index = this.allPairs.indexOf(pair); // Use the index to maintain order
                results[index] = result; // Store result
                this.pairsData[pair] = result; // Update pairsData with the latest result
            }
        }
        return results; // Return the results in the same order as allPairs
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async botLoop() {
        while (!this.config.loop) {
            console.time('Processing round');
            const results = await this.processAllPairs();
            console.timeEnd('Processing round');
            
            this.tablePrinter.print(results); // Use the TablePrinter instance to print the table
            if (this.config.saveData) saveData(this.pairsData, 'final_data.json');
            await this.wait(this.config.delay);
        }
    }
}

// Usage
const bot = new TradingBot();
bot.startBot();
