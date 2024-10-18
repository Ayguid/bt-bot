require('dotenv').config(); // Environment variables
// Node.js built-in modules
const path = require('path');
// Local project modules
const { klines, fetchMyOrders } = require('../utils/binance-spot.js');
const { getIndicators } = require('../analysis/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('../analysis/trendCalcs.js');
const { saveData } = require('../utils/fileManager.js');
const RateLimitedQueue = require('../classes/RateLimitedQueue.js');
const TablePrinter = require('../utils/tablePrinter.js');
const TelegramBotHandler = require('./TelegramBotHandler.js');
const PairManager = require('./PairManager.js');
const config = require('../config.js'); // Configuration file

class TradingBot {

    constructor() {
        this.config = config; // Use the imported config
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter();
        this.botDataLogger = {};
        // Initialize the PairManager with the path to the pairs file
        this.pairManager = new PairManager(path.join(__dirname, '..', 'pairs.json'));
        // Initialize the Telegram bot handler with a callback to handle commands
        this.telegramBotHandler = new TelegramBotHandler(this.config, this.executeCommand.bind(this));
    }

    // Initialization method
    async init() {
        try {
            await this.pairManager.loadPairsFromFile(); // Load pairs
            await this.pairManager.getTradeablePairs();
            this.telegramBotHandler.initialize();
            console.log('TradingBot initialized successfully');
        } catch (error) {
            console.error('Error initializing bot:', error);
            process.exit(1); // Exit if initialization fails
        }
    }
      
    async executeCommand(command, args) {
        const commands = {
            start: () => this.startBot(),
            stop: () => this.stopBot(),
            addPair: () => this.pairManager.addRemovePair(args[0], true, false),
            removePair: () => this.pairManager.addRemovePair(args[0], false, false),
            addTpair: () => this.pairManager.addRemovePair(args[0], true, true),
            removeTpair: () => this.pairManager.addRemovePair(args[0], false, true),
        };
        const action = commands[command];
        return action ? await action() : 'Unknown command.';
    }

    sendAlert(pair, signal) {
        // Delegate alert sending to the Telegram bot handler
        this.telegramBotHandler.sendAlert(pair, signal);
    }

    startBot() {
        if (this.config.isRunning) return 'Bot is already running.';
        console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
        this.config.isRunning = true;
        this.botLoop();
        return 'Bot started.';
    }

    stopBot() {
        if (!this.config.isRunning) return 'Bot is already stopped.';
        console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
        this.config.isRunning = false;
        return 'Bot stopped.';
    }

    isValidData(ohlcv) {
        return !(ohlcv instanceof Error || !Array.isArray(ohlcv) || ohlcv.length === 0);
    }

    async processPair(pair) {
        const joinedPair = pair.replace('_', '');

        try {
            const ohlcv = await this.makeQueuedReq(klines, joinedPair, this.config.klinesInterval);
            // const [ohlcv, orders] = await Promise.all([ //parallel method
            //     this.makeQueuedReq(klines, joinedPair, this.config.klinesInterval, this.config.klinesLimit),
            //     this.makeQueuedReq(fetchMyOrders, joinedPair)
            // ]);
            if (!this.isValidData(ohlcv)) {;
                console.error(`Failed to fetch OHLCV data for ${pair}`);
                if (this.config.debug) console.error(`Error or invalid data:`, ohlcv);
                return null; // Return early if OHLCV is invalid
            }
            // Handle missing or invalid orders separately, maybe ask for orders if only trade signal
            // if (!this.isValidData(orders)) {
            //     console.warn(`Failed to fetch orders for ${pair}. Orders data:`, orders);
            //     if (this.config.debug) console.warn(`Error details:`, orders);
            // }

            const indicators = getIndicators(ohlcv);
            const trend = analyzeCandles(ohlcv, 12);
            const signal = shouldBuyOrSell(indicators, ohlcv);

            this.sendAlert(pair, signal);//the method checks for time passed and signal type
            
            // buy/sell logic
            // Implement order placement logic here
            // if ((signal === 'Buy' || signal === 'Sell') && this.tradeablePairs.includes(pair)) {
            //     console.log(`Placing order for ${pair} with signal: ${signal}`);
            // }
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

    async makeQueuedReq(apiFunction, ...args) {
        return new Promise((resolve, reject) => {
            this.queue.enqueue(async (done) => {
                try {
                    const result = await apiFunction(...args); // Spread the args to handle multiple parameters
                    resolve(result);
                } catch (error) {
                    console.error(`Error executing request with arguments:`, args, error); // Log args for better debugging
                    reject(error);
                } finally {
                    done();// done callback, which is crucial for the RateLimitedQueue
                }
            });
        });
    }

    async processAllPairs() {
        const allPairs = this.pairManager.getAllPairs(); // Get all pairs from PairManager
        const results = new Array(allPairs.length); // Initialize results array to map the order of the pairs
    
        for (const pair of allPairs) {
            const result = await this.processPair(pair);
            if (result) {
                const index = allPairs.indexOf(pair); // Use the index to maintain order
                results[index] = result; // Store result
                this.botDataLogger[pair] = result; // Update botDataLogger with the latest result
            }
        }
        return results; // Return the results in the same order as allPairs
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async botLoop() {
        while (this.config.isRunning) {
            console.time('Processing round');
            const results = await this.processAllPairs();
            console.timeEnd('Processing round');
            //
            this.tablePrinter.print(results); // Use the TablePrinter instance to print the table
            if (this.config.saveData) saveData(this.botDataLogger, 'final_data.json');
            //
            console.time('Delay round');
            await this.wait(this.config.delay);
            console.timeEnd('Delay round');
        }
    }
}

// Usage
(async () => {
    const bot = new TradingBot();
    await bot.init();
    bot.startBot();
})();