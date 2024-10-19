require('dotenv').config(); // Environment variables
// Node.js built-in modules
const path = require('path');
const { execSync } = require('child_process'); // To run system commands for time synchronization
// Local project modules
const { serverTime, klines, fetchMyOrders, tickerPrice } = require('../utils/binance-spot.js');
const { getIndicators } = require('../analysis/indicators.js');
const { analyzeCandles, shouldBuyOrSell } = require('../analysis/trendCalcs.js');
const { saveData } = require('../utils/fileManager.js');
const RateLimitedQueue = require('../classes/RateLimitedQueue.js');
const TablePrinter = require('../utils/tablePrinter.js');
const TelegramBotHandler = require('./TelegramBotHandler.js');
const PairManager = require('./PairManager.js');
const config = require('../config.js'); // Configuration file

class TradingBot {
    //ORDER_TYPES
    static BUY = 'BUY';
    static SELL = 'SELL';
    //ORDER_STATUS
    static FILLED = 'FILLED';
    static PARTIALLY_FILLED = 'PARTIALLY_FILLED';
    static CANCELED = 'CANCELED';
    static NEW = 'NEW';
    //TRENDS
    static BULLISH = 'Bullish';
    static SIDEWAYS = 'Sideways';

    constructor() {
        this.config = config; // Use the imported config
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter();
        this.botDataLogger = {};
        // Initialize the PairManager with the path to the pairs file
        this.pairManager = new PairManager(path.join(__dirname, '..', 'pairs.json'));
        // Initialize the Telegram bot handler with a callback to handle commands
        this.telegramBotHandler = new TelegramBotHandler(this.config, this.executeCommand.bind(this));
        this.startTimeCheck(); // Start the server time checking interval
    }

    // Initialization method
    init() {
        try {
            this.pairManager.loadPairsFromFile(); // Load pairs
            this.pairManager.getTradeablePairs();
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

    sendGroupChatAlert(pair, signal) {
        // Delegate alert sending to the Telegram bot handler
        this.telegramBotHandler.sendGroupChatAlert(pair, signal);
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

    async trade(pair, currentPrice, orders, trend, signal) {
        if (!pair || !currentPrice || !orders || !trend || !signal) {
            console.error('Missing data/params to trade');
            return;
        }
        console.log('\x1b[32mAttempting to trade\x1b[0m', { pair, price: currentPrice.price, signal });
        //
        const approveBuyIndicators = signal === TradingBot.BUY && 
            [TradingBot.BULLISH, TradingBot.SIDEWAYS].includes(trend.priceTrend);
        const approveSellIndicators = signal === TradingBot.SELL && 
            trend.priceTrend === TradingBot.BULLISH;
        //
        if (!Array.isArray(orders) || orders.length === 0) {
            console.log(`No orders for ${pair}, considering placing one based on current indicators.`);
            await this.considerNewOrder(pair, currentPrice, approveBuyIndicators, approveSellIndicators);
        } else {
            const latestOrder = orders.reduce((latest, order) => 
                new Date(order.time) > new Date(latest.time) ? order : latest
            );

            console.log(`Latest order - status: ${latestOrder.status}, side: ${latestOrder.side}`);

            switch (latestOrder.status) {
                case TradingBot.FILLED:
                    await this.handleFilledOrder(pair, currentPrice, latestOrder, approveBuyIndicators, approveSellIndicators);
                    break;
                case TradingBot.PARTIALLY_FILLED:
                    await this.handlePartiallyFilledOrder(pair, currentPrice, latestOrder, approveBuyIndicators, approveSellIndicators);
                    break;
                case TradingBot.NEW:
                    console.log('Order pending. Monitoring for completion.');
                    await this.monitorPendingOrder(pair, currentPrice, latestOrder);
                    break;
                case TradingBot.CANCELED:
                    console.log('Last order was canceled. Considering new order based on current conditions.');
                    await this.considerNewOrder(pair, currentPrice, approveBuyIndicators, approveSellIndicators);
                    break;
                default:
                    console.log(`Unhandled order status: ${latestOrder.status}. Please review.`);
            }
        }
    }

    async handleFilledOrder(pair, currentPrice, order, approveBuyIndicators, approveSellIndicators) {
        if (order.side === TradingBot.SELL && approveBuyIndicators) {
            console.log('Last sell order filled. Conditions favorable for buying.');
            await this.placeBuyOrder(pair);
        } else if (order.side === TradingBot.BUY && approveSellIndicators) {
            console.log('Last buy order filled. Conditions favorable for selling.');
            await this.placeSellOrder(pair);
        } else {
            console.log('Filled order exists, but current conditions not favorable for new order.');
        }
    }

    async handlePartiallyFilledOrder(pair, currentPrice, order, approveBuyIndicators, approveSellIndicators) {
        console.log(`Order for ${pair} is partially filled. Filled amount: ${order.executedQty}`);
        
        const remainingQty = order.quantity - order.executedQty;
        console.log(`Remaining quantity to be filled: ${remainingQty}`);

        if (order.side === TradingBot.BUY) {
            if (approveBuyIndicators) {
                console.log('Conditions still favorable for buying. Keeping the order open.');
            } else {
                console.log('Conditions no longer favorable for buying. Consider cancelling remaining order.');
                // await this.cancelRemainingOrder(pair, order);
            }
        } else if (order.side === TradingBot.SELL) {
            if (approveSellIndicators) {
                console.log('Conditions still favorable for selling. Keeping the order open.');
            } else {
                console.log('Conditions no longer favorable for selling. Consider cancelling remaining order.');
                // await this.cancelRemainingOrder(pair, order);
            }
        }

        // Implement any additional async logic for partially filled orders
    }

    async considerNewOrder(pair, currentPrice, approveBuyIndicators, approveSellIndicators) {
        if (approveBuyIndicators) {
            console.log('Conditions favorable for placing a buy order');
            await this.placeBuyOrder(pair);
        } else if (approveSellIndicators) {
            console.log('Conditions favorable for placing a sell order');
            await this.placeSellOrder(pair);
        } else {
            console.log('Current conditions not favorable for placing a new order');
        }
    }

    async placeBuyOrder(pair, currentPrice) {
        console.log(`Placing buy order for ${pair}`);
        // Implement async logic to place a buy order
        // For example:
        // const order = await this.api.placeBuyOrder(pair, quantity, price);
        // this.currentTrades.set(pair, { side: TradingBot.BUY, status: TradingBot.NEW, orderId: order.id });
    }

    async placeSellOrder(pair, currentPrice) {
        console.log(`Placing sell order for ${pair}`);
        // Implement async logic to place a sell order
        // For example:
        // const order = await this.api.placeSellOrder(pair, quantity, price);
        // this.currentTrades.set(pair, { side: TradingBot.SELL, status: TradingBot.NEW, orderId: order.id });
    }

    async monitorPendingOrder(pair, currentPrice, order) {
        console.log(`Monitoring pending ${order.side} order for ${pair}`);
        // Implement async logic to monitor pending order
        // For example:
        // const updatedOrder = await this.api.getOrderStatus(pair, order.id);
        // if (updatedOrder.status !== TradingBot.NEW) {
        //     await this.handleOrderStatusChange(pair, updatedOrder);
        // }
    }

    // Additional method for cancelling orders
    async cancelRemainingOrder(pair, currentPrice, order) {
        console.log(`Cancelling remaining order for ${pair}`);
        // Implement async logic to cancel the remaining order
        // For example:
        // await this.api.cancelOrder(pair, order.id);
        // this.currentTrades.delete(pair);
    }

    async processPair(pair, isTradeable = false) {
        console.log('\x1b[33m%s\x1b[0m',`${pair}------------------`)
        const joinedPair = pair.replace('_', '');
        const [ohlcv, orders, currentPrice] = await Promise.all([ //parallel method
            this.makeQueuedReq(klines, joinedPair, this.config.klinesInterval),
            isTradeable ? this.makeQueuedReq(fetchMyOrders, joinedPair) : false,
            isTradeable ? this.makeQueuedReq(tickerPrice, joinedPair) : false,
        ]);
        //
        if (ohlcv.error) {;
            console.error('Failed to fetch OHLCV data');
            if (this.config.debug) console.error(`Error or invalid data:`, ohlcv);
            return null; // Return early if OHLCV is invalid
        }
        // There can only be orders if the pair is tradeable
        if (orders.error) {
            console.warn('Failed to fetch orders');
            if (this.config.debug) {
                console.warn(`Error details:`, orders);
            }
        } 
        // There can only be current price if the pair is tradeable
        if (currentPrice.error) {
            console.warn('Failed to fetch current price');
            if (this.config.debug) {
                console.warn(`Error details:`, currentPrice);
            }
        } 
        //analysis
        const indicators = getIndicators(ohlcv);
        const trend = analyzeCandles(ohlcv, 12);
        const signal = shouldBuyOrSell(indicators, ohlcv);
        this.sendGroupChatAlert(pair, signal);// the method itself checks for time passed between alerts and signal type
        //trade
        if(isTradeable && !orders.error && !currentPrice.error) await this.trade(joinedPair, currentPrice, orders, trend, signal);
        //return result
        return {
            pair,
            indicators,
            trend,
            signal,
            date: new Date().toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
        };  
    }

    async processAllPairs() {
        const allPairs = this.pairManager.getAllPairs(); // Get all pairs from PairManager
        const tradeablePairs = this.pairManager.getTradeablePairs(); // Get all pairs from PairManager
        const results = new Array(allPairs.length); // Initialize results array to map the order of the pairs
    
        for (const pair of allPairs) {
            try {
                const isTradeable = tradeablePairs.includes(pair);
                const result = await this.processPair(pair, isTradeable);
                if (result) {
                    const index = allPairs.indexOf(pair); // Use the index to maintain order
                    results[index] = result; // Store result
                    this.botDataLogger[pair] = result; // Update botDataLogger with the latest result
                }
                if (this.config.pairDelay) await this.wait(3000); //for debug 
            } catch (error) {
                console.error(`Error processing ${pair}:`, error); // Continue processing other pairs
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
            if (this.config.loopDelay) await this.wait(this.config.loopDelay);
            console.timeEnd('Delay round');
        }
    }
    //server time diff part
    // Start the time checking process
    startTimeCheck() {
        const timeCheckInterval = this.config.timeCheckInterval || 60000; // Default to 60 seconds if not specified
        setInterval(() => this.checkTimeDifference(), timeCheckInterval);
    }
    // New method to fetch server time
    async fetchServerTime() {
        const response = await this.makeQueuedReq(serverTime);
        return response;
    }
    // Method to check time difference and synchronize if necessary
    async checkTimeDifference() {
        const serverTimeData = await this.fetchServerTime();
        if (!serverTimeData || serverTimeData.error) return;

        const serverTime = serverTimeData.serverTime;
        const localTime = Date.now();
        const timeDifference = Math.abs(localTime - serverTime);

        console.log(`Time difference: ${timeDifference} ms`);

        if (timeDifference > this.config.maxTimeDifferenceMs) {
            console.log('Time difference too large. Resynchronizing system time...');
            if(this.config.shouldResynch) this.resynchronizeTime();
        }
    }
    // Function to resynchronize system time
    resynchronizeTime() {//should be a cron job, its not the bots responsability
        try {
            // Resynchronize time using system command (for Linux/Unix systems)
            execSync('sudo ntpdate pool.ntp.org'); // Adjust command as necessary for your OS
            console.log('System time synchronized.');
            // Optionally restart the script or notify that synchronization has occurred
            process.exit(0); // Exit the process to trigger a restart
        } catch (error) {
            console.error('Failed to resynchronize time:', error);
        }
    }
}

// Usage
(() => {
    const bot = new TradingBot();
    bot.init();
    bot.startBot();
})();