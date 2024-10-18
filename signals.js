require('dotenv').config(); // Environment variables
// Node.js built-in modules
const fs = require('fs');
const path = require('path');
// Third-party dependencies
const TelegramBot = require('node-telegram-bot-api');
// Local project modules
const { klines, fetchMyOrders } = require('./utils/binance-spot.js');
const { getIndicators } = require('./analysis/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('./analysis/trendCalcs.js');
const { saveData } = require('./utils/fileManager.js');
const RateLimitedQueue = require('./classes/RateLimitedQueue.js');
const TablePrinter = require('./utils/tablePrinter.js');
const config = require('./config.js'); // Configuration file

class TradingBot {

    constructor() {
        this.config = config; // Use the imported config
        this.pairsFile = path.join(__dirname, 'pairs.json');
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter();
        this.orders = {};
        this.pairsData = {};
        this.lastAlertTimes = { buy: {}, sell: {} };
    }

    // Initialization method
    async init() {
        try {
            // Load pairs from file
            const pairsData = this.loadPairsFromFile();
            this.allPairs = pairsData.pairs || [];
            this.tradeablePairs = pairsData.tradeablePairs || [];
            this.initializeTelegramBot();
            // Optionally, log success message or other initialization details
            console.log('TradingBot initialized successfully');
        } catch (error) {
            console.error('Error initializing bot:', error);
            process.exit(1); // Exit if initialization fails
        }
    }

    // Load the pairs from the external file
    loadPairsFromFile() {
        try {
            const data = fs.readFileSync(this.pairsFile);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading pairs file, using default pairs:', error);
            return { pairs: ['BTC_USDT', 'ETH_USDT'], tradeablePairs: [] }; // Default pairs if file read fails
        }
    }

    // Save the updated pairs to the external file
    savePairsToFile() {
        try {
            const data = JSON.stringify({ pairs: this.allPairs, tradeablePairs: this.tradeablePairs }, null, 2);
            fs.writeFileSync(this.pairsFile, data);
        } catch (error) {
            console.error('Error saving pairs to file:', error);
        }
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
        //return msg;
    }
    
    initializeTelegramBot() {
        if (!this.config.telegramBotEnabled) {
            console.log('Telegram bot is disabled via configuration.');
            return; // Do not initialize the bot if disabled
        }
        const token = process.env.TELEGRAM_BOT_TOKEN;
        // Check if Telegram bot token is set
        if (!token) {
            throw new Error('Telegram bot token not set in environment variables.');
        }
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

    sendAlert(pair, signal) { //might eliminate async later on, i dont care about the msg being sent or not
        if (!this.config.telegramBotEnabled) {
            console.log(`Telegram bot is disabled, not sending ${signal} alert for ${pair}.`);
            return; // Exit early if the Telegram bot is disabled
        }
        const normalizedSignal = signal.toLowerCase();
        if (!['buy', 'sell'].includes(normalizedSignal)) return;
        const currentTime = Date.now();
        if (!this.lastAlertTimes[normalizedSignal]) {
            this.lastAlertTimes[normalizedSignal] = {};
        }
        const lastAlertTime = this.lastAlertTimes[normalizedSignal][pair] || 0;
        const timeSinceLastAlert = currentTime - lastAlertTime;
        if (timeSinceLastAlert >= this.config.alertCooldown) {
            try {
                this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `${signal} signal for ${pair}`);//await maybe remove
                this.lastAlertTimes[normalizedSignal][pair] = currentTime;
                console.log(`Alert sent for ${pair} (${signal})`);
            } catch (error) {
                console.error(`Failed to send alert for ${pair} (${signal}):`, error);
            }
        } else {
            console.log(`Alert for ${pair} (${signal}) skipped. Cooldown: ${this.config.alertCooldown - timeSinceLastAlert}ms remaining`);
        }
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
            const [ohlcv, orders] = await Promise.all([
                this.makeQueuedReq(klines, joinedPair, this.config.klinesInterval, this.config.klinesLimit),
                this.makeQueuedReq(fetchMyOrders, joinedPair)
            ]);
            if (!this.isValidData(ohlcv)) {;
                console.error(`Failed to fetch OHLCV data for ${pair}`);
                if (this.config.debug) console.error(`Error or invalid data:`, ohlcv);
                return null; // Return early if OHLCV is invalid
            }
            // Handle missing or invalid orders separately
            // if (!this.isValidData(orders)) {
            //     console.warn(`Failed to fetch orders for ${pair}. Orders data:`, orders);
            //     if (this.config.debug) console.warn(`Error details:`, orders);
            // }
            this.orders[pair] = orders;

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
                    done();
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
        while (this.config.isRunning) {
            console.time('Processing round');
            const results = await this.processAllPairs();
            console.timeEnd('Processing round');
            //
            this.tablePrinter.print(results); // Use the TablePrinter instance to print the table
            if (this.config.saveData) saveData(this.pairsData, 'final_data.json');
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