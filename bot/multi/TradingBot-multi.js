require('dotenv').config(); // Environment variables
// Node.js built-in modules
const path = require('path');
const crypto = require("crypto");
const { execSync } = require('child_process'); // To run system commands for time synchronization
// Local project modules
const { serverTime, klines, fetchMyOrders, tickerPrice, userAsset, fetchMyAccount, placeOrder, cancelOrder, cancelAndReplace, exchangeInfo } = require('../../utils/binance-spot');
const { getIndicators } = require('../../analysis/multi/indicators-multi');
//const { analyzeMultipleTimeframes } = require('../../analysis/multi/trendCalcs-multiframe');
const MarketAnalyzer = require('../../analysis/multi/MarketAnalyzer');
const { saveData } = require('../../utils/fileManager');
const RateLimitedQueue = require('../../classes/RateLimitedQueue');
const TablePrinter = require('./TablePrinter-multi');
const TelegramBotHandler = require('./TelegramBotHandler-multi');
const PairManager = require('../PairManager');
const { plusPercent, minusPercent, calculateProfit, timePassed } = require('../../utils/helpers');
const config = require('../../config'); // Configuration file

class TradingBot {
    //ORDER_SIDES
    static BUY = 'BUY';
    static STRONG_BUY = 'STRONG_BUY';
    static SELL = 'SELL';
    static STRONG_SELL = 'STRONG_SELL';
    //ORDER_STATUS
    static FILLED = 'FILLED';
    static PARTIALLY_FILLED = 'PARTIALLY_FILLED';
    static CANCELED = 'CANCELED';
    static NEW = 'NEW';
    static EXPIRED = 'EXPIRED';

    constructor() {
        this.config = config; // Use the imported config
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter();
        this.botDataLogger = {};
        this.exchangeInfo = {};
        // Initialize the PairManager with the path to the pairs file
        this.pairManager = new PairManager(path.join(__dirname, '..', '../pairs-multi.json'));
        // Initialize the Telegram bot handler with a callback to handle commands
        this.telegramBotHandler = new TelegramBotHandler(this.config, this.executeCommand.bind(this));
        this.startTimeCheck(); // Start the server time checking interval
    }
    // Initialization method
    async init() {
        try {
            console.log('Loading Pairs');
            this.pairManager.loadPairsFromFile(); // Load pairs 
            this.telegramBotHandler.initialize();
            // Fetch exchange info only once during initialization
            await this.fetchExchangeInfo();
            console.log('TradingBot initialized successfully');
        } catch (error) {
            console.error('Error initializing bot:', error);
            process.exit(1); // Exit if initialization fails
        }
    }
    //    
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
    //
    sendGroupChatAlert(pair, analysis) {
        // Delegate alert sending to the Telegram bot handler
        this.telegramBotHandler.sendGroupChatAlert(pair, analysis);
    }
    //
    startBot() {
        if (this.config.isRunning) return 'Bot is already running.';
        console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
        this.config.isRunning = true;
        this.botLoop();
        return 'Bot started.';
    }
    //
    stopBot() {
        if (!this.config.isRunning) return 'Bot is already stopped.';
        console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
        this.config.isRunning = false;
        return 'Bot stopped.';
    }
    //
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
    // Helper function to determine decimals from exchange filter values
    getDecimals(filterValue) {
        //Remove trailing zeros and decimal point if it's only followed by zeros
        const trimmedValue = parseFloat(filterValue).toString();
        const parts = trimmedValue.split('.');
        return parts[1] ? parts[1].length : 0;
    }
    newBotOrderId() {
        const id = crypto.randomBytes(16).toString("hex");
        return 'bot-' + id;
    }
    // New method to fetch and store exchangeInfo only once
    async fetchExchangeInfo() {
        console.log('Fetching exchange information');
        this.exchangeInfo = await this.makeQueuedReq(exchangeInfo);
        console.log('Exchange information loaded');
    }
    //
    async trade(pair, currentPrice, orders, analysis) {
        if (!pair || !currentPrice || !orders || !analysis) {
            console.error('Missing trading parameters');
            return;
        }

        console.log('\x1b[32mTrading\x1b[0m', pair.key, 'at', currentPrice);

        const buyIsApproved = analysis.consensusSignal === TradingBot.BUY ||  analysis.consensusSignal ===  TradingBot.STRONG_BUY;
        const sellIsApproved = analysis.consensusSignal === TradingBot.SELL ||  analysis.consensusSignal ===  TradingBot.STRONG_SELL;
        //console.log(analysis)
        if (!Array.isArray(orders) || orders.length === 0) {
            console.log('No existing orders - evaluating new trade');
            await this.considerNewOrder(pair, false, currentPrice, buyIsApproved, sellIsApproved);
            return;
        }

        const sortedOrders = [...orders].sort((a, b) => new Date(b.time) - new Date(a.time));
        const [lastOrder, previousOrder] = sortedOrders.slice(0, 2);

        switch (lastOrder.status) {
            case TradingBot.FILLED:
                await this.handleFilledOrder(pair, lastOrder, currentPrice, buyIsApproved);
                break;
            case TradingBot.PARTIALLY_FILLED:
                await this.handlePartiallyFilledOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved);
                break;
            case TradingBot.NEW:
                await this.monitorPendingOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved);
                break;
            case TradingBot.CANCELED:
            case TradingBot.EXPIRED:
                await this.considerNewOrder(pair, lastOrder, currentPrice, buyIsApproved, sellIsApproved);
                break;
            default:
                console.log('Unhandled order status:', lastOrder.status);
        }
    }
    //
    async handleExpiredOrder(pair, lastOrder) {
        if (lastOrder.side === TradingBot.SELL) {
            console.log('Last sell order expired.');
            //await this.cancelAndSellToMarketPrice(pair, lastOrder);
        } else if (lastOrder.side === TradingBot.BUY) { //order.side === TradingBot.BUY && sellIsApproved
            console.log('Last buy order expired.');
            //await this.placeSellOrder(pair, lastOrder);
        } else {
            console.log('Filled order exists, but current conditions not favorable for new order.');
        }
    }
    //
    async considerNewOrder(pair, lastOrder = false, currentPrice, buyIsApproved, sellIsApproved) {
        if (buyIsApproved) {
            console.log('Conditions favorable for placing a buy order');
            await this.placeBuyOrder(pair, currentPrice);
        } else if (sellIsApproved) {
            console.log('Conditions favorable for placing a sell order');
            //await this.placeSellOrder(pair, lastOrder);
        } else {
            console.log('Current conditions not favorable for placing a new order');
        }
    }
    //
    async handleFilledOrder(pair, lastOrder, currentPrice, buyIsApproved, sellIsApproved = false) {
        if (lastOrder.side === TradingBot.SELL && buyIsApproved) {
            console.log('Last sell order filled. Conditions favorable for buying.');
            await this.placeBuyOrder(pair, currentPrice);
        } else if (lastOrder.side === TradingBot.BUY) { //order.side === TradingBot.BUY && sellIsApproved
            console.log('Last buy order filled. Conditions favorable for selling.');
            await this.placeSellOrder(pair, lastOrder);
        } else {
            console.log('Filled order exists, but current conditions not favorable for new order.');
        }
    }
    //
    async handlePartiallyFilledOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved) {
        console.log(`Order for ${pair.key} is partially filled. Filled amount: ${lastOrder.executedQty}`);
        //const maxWaitingTime = 2; //in hrs
        const waited_time = timePassed(new Date(lastOrder.updateTime)) / 3600; // to convert secs to hrs, divide by 3600
        console.log('Time waiting: ', waited_time);
        const remainingQty = lastOrder.origQty - lastOrder.executedQty;
        console.log(`Remaining quantity to be filled: ${remainingQty}`);

        if (lastOrder.side === TradingBot.BUY) {
            if (buyIsApproved) {
                console.log('Conditions still favorable for buying. Keeping the order open.');
            } else {
                console.log('Conditions no longer favorable for buying. Consider cancelling remaining order.');
                // await this.cancelRemainingOrder(pair, order);
            }
        } else if (lastOrder.side === TradingBot.SELL) {
            const currentProfit = calculateProfit(currentPrice, previousOrder.price);//should be order price off buy order, this is not accurate
            console.log(`Profit is: ${currentProfit} %`);
            if (sellIsApproved) {
                console.log('Conditions still favorable for selling. Keeping the order open.');
            }
            if (currentProfit <= pair.okLoss) { // waited_time > maxWaitingTime ||
                console.log(`Selling at current price, too much loss.`);
                await this.cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice);
                //await this.cancelAndSellToMarketPrice(pair, lastOrder);
            } else {
                console.log('Conditions no longer favorable for selling. Consider cancelling remaining order.');
                // await this.cancelRemainingOrder(pair, order);
            }
        }
    }
    //
    async monitorPendingOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved) {
        console.log('\x1b[32m%s\x1b[0m', 'Current price', currentPrice);
        console.log(
            `Monitoring pending ${lastOrder.side},
            order for ${pair.key}, 
            orderId: ${lastOrder.orderId}, 
            Order Price: ${lastOrder.price},
            Order Qty: ${lastOrder.origQty}
            `
        );
        //
        if (lastOrder.side == TradingBot.SELL) {
            const currentProfit = calculateProfit(currentPrice, previousOrder.price);//should be order price off buy order, this is not accurate
            console.log('\x1b[33m%s\x1b[0m', 'Bought price', previousOrder.price);
            console.log(`Profit is: ${currentProfit} %`);
            if (currentProfit <= pair.okLoss && currentPrice < previousOrder.price) { // && currentPrice < lastOrder.price,,,i dont like selling at market price, maybe cancell and resell at current price
                console.log(123123123);
                await this.cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice);
                //await this.cancelAndSellToMarketPrice(pair, lastOrder);
            };
        }
        else if (lastOrder.side == TradingBot.BUY) {
            const orderPriceDiff = calculateProfit(currentPrice, lastOrder.price);//should be order price off buy order, this is not accurate
            console.log(`Price diff with order is: ${orderPriceDiff} %`);
            if (!buyIsApproved || orderPriceDiff >= pair.okDiff) {
                console.log(`Cancelling Buy Order, conditions no longer ok, price went up by ${orderPriceDiff} %`);
                await this.cancelOrder(pair, lastOrder);
            }
        }
    }
    //
    async placeBuyOrder(pair, currentPrice) {
        console.log(`Placing buy order for ${pair.key}`);
        const balances = await this.getBalances(pair.key);
        //const baseAsset = balances[0];
        const quoteAsset = balances[1];
        if (quoteAsset.free < pair.orderQty) {
            console.warn('Not enough balance to place buy order.');
            return;
        }
        const filters = this.exchangeInfo.symbols.find(symbol => symbol.symbol == pair.joinedPair).filters;
        const priceDecimals = this.getDecimals(filters.find(f => f.filterType === 'PRICE_FILTER').tickSize);
        const qtyDecimals = this.getDecimals(filters.find(f => f.filterType === 'LOT_SIZE').stepSize);
        //
        const buyPrice = minusPercent(pair.belowPrice, currentPrice).toFixed(priceDecimals);
        const qty = (pair.orderQty / buyPrice).toFixed(qtyDecimals);
        const order = await this.makeQueuedReq(placeOrder, pair.joinedPair, TradingBot.BUY, 'LIMIT', { price: buyPrice, quantity: qty, timeInForce: 'GTC', newClientOrderId: this.newBotOrderId() });
        return order;
    }
    //
    async placeSellOrder(pair, lastOrder) {
        console.log(`Placing sell order for ${pair.key}`);
        const balances = await this.getBalances(pair.key);
        const baseAsset = balances[0];
        //const quoteAsset = balances[1];
        if (baseAsset.free <= 0) {//fix this
            console.warn('Not enough balance to place sell order.');
            return;
        }
        //   
        const filters = this.exchangeInfo.symbols.find(symbol => symbol.symbol == pair.joinedPair).filters;
        const priceDecimals = this.getDecimals(filters.find(f => f.filterType === 'PRICE_FILTER').tickSize);
        //const qtyDecimals = this.getDecimals(filters.find(f => f.filterType === 'LOT_SIZE').stepSize);
        const sellPrice = plusPercent(pair.profitMgn, lastOrder.price).toFixed(priceDecimals); //later maybe we subtract x%
        //
        const qty = lastOrder.executedQty; //(pair.orderQty / currentPrice).toFixed(pair.decimals);
        const order = await this.makeQueuedReq(placeOrder, pair.joinedPair, TradingBot.SELL, 'LIMIT', { price: sellPrice, quantity: qty, timeInForce: 'GTC', newClientOrderId: this.newBotOrderId() });
        return order;
    }
    //
    async cancelOrder(pair, lastOrder) {
        //console.log(lastOrder);
        const order = await this.makeQueuedReq(cancelOrder, pair.joinedPair, lastOrder.orderId);
        return order;
    }
    //
    async cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice) {
        console.log('Cancelling and Selling to current price, too much loss.');
        const order = await this.makeQueuedReq(cancelAndReplace, pair.joinedPair, TradingBot.SELL, 'LIMIT', { cancelOrderId: lastOrder.orderId, quantity: lastOrder.origQty, price: currentPrice, timeInForce: 'GTC' });
        return order;
    }
    //
    // async cancelAndSellToMarketPrice(pair, lastOrder) {
    //     const order = await this.makeQueuedReq(cancelAndReplace, pair.joinedPair, TradingBot.SELL, 'MARKET', { cancelOrderId: lastOrder.orderId, quantity: lastOrder.origQty });
    //     return order;
    // }
    // Additional method for cancelling orders
    async cancelRemainingOrder(pair, currentPrice, order) {
        console.log(`Cancelling remaining order for ${pair}`);
        // Implement async logic to cancel the remaining order
        // For example:
        // await this.api.cancelOrder(pair, order.id);
        // this.currentTrades.delete(pair);
    }
    //
    async processPair(pair) {
        console.log('\x1b[33mProcessing\x1b[0m', pair.key);
        pair.joinedPair = pair.key.replace('_', '');

        try {
            // Fetch data for multiple timeframes
            const [ohlcv1H, ohlcv4H, orders, currentPrice] = await Promise.all([
                this.makeQueuedReq(klines, pair.joinedPair, '1h'),
                this.makeQueuedReq(klines, pair.joinedPair, '4h'),
                pair.tradeable ? this.makeQueuedReq(fetchMyOrders, pair.joinedPair) : [],
                pair.tradeable ? this.makeQueuedReq(tickerPrice, pair.joinedPair) : null
            ]);

            // Error handling
            if (ohlcv1H.error || ohlcv4H.error) {
                console.error('OHLCV error:', ohlcv1H.error || ohlcv4H.error);
                return null;
            }
            // Ensure same number of candles for consistency
            const minLength = Math.min(ohlcv1H.length, ohlcv4H.length);
            const synced1H =  ohlcv1H.slice(-minLength);
            const synced4H =  ohlcv4H.slice(-minLength);
            // Get indicators
            // const [indicators1H, indicators4H] = await Promise.all([
            //     getIndicators(synced1H),
            //     getIndicators(synced4H)
            // ]);
            //sync way
            const indicators1H = getIndicators(synced1H);
            const indicators4H = getIndicators(synced4H);
            //console.log(indicators1H, indicators4H)
            // Multi-timeframe analysis
            const analysis = MarketAnalyzer.analyzeMultipleTimeframes(
                { '1h': indicators1H, '4h': indicators4H },
                { '1h': ohlcv1H, '4h': ohlcv4H },
                {
                    analysisWindow: this.config.analysisWindow,
                    primaryTimeframe: this.config.klinesInterval,
                    weights: { '1h': 1, '4h': 2 }
                }
            );
            //console.log(analysis.signals[0].details);
            // Send alerts and execute trades
            const normalizedSignal = analysis.consensusSignal.toLowerCase();
            if (['buy', 'sell', 'strong_buy', 'strong_sell'].includes(normalizedSignal)) this.sendGroupChatAlert(pair.key, analysis);
            if (pair.tradeable && currentPrice?.price) {
                await this.trade(pair, currentPrice.price, orders || [], analysis);
            }
            //console.log({...pair},analysis.signals[0]);
            return {
                ...pair,
                indicators: { '1h': indicators1H, '4h': indicators4H },
                analysis,
                orders,
                currentPrice: currentPrice?.price,
                date: new Date().toLocaleString()
            };

        } catch (error) {
            console.error('Error processing pair:', pair.key, error);
            return null;
        }
    }

    async getBalances(pair) { // userAsset wont work on testnet, this is a workaround that uses the whole wallet balance in testnet
        const assetKey = pair.split("_")[0];//ETH_
        const stableKey = pair.split("_")[1];//_USDT
        console.log(assetKey, stableKey);
        const TESTNET = process.env.TESTNET == 'true';
        let baseAsset;
        let quoteAsset;
        if (TESTNET) {
            const wallet = await this.makeQueuedReq(fetchMyAccount);
            baseAsset = wallet.balances.find(asset => asset.asset == assetKey)
            quoteAsset = wallet.balances.find(asset => asset.asset == stableKey)

        } else {
            [baseAsset, quoteAsset] = await Promise.all([ //parallel method
                this.makeQueuedReq(userAsset, assetKey),
                this.makeQueuedReq(userAsset, stableKey)
            ]);
            baseAsset = baseAsset[0]
            quoteAsset = quoteAsset[0]
        }
        console.log(baseAsset, quoteAsset);
        return [
            baseAsset,
            quoteAsset
        ];
    }

    async processAllPairs() {
        console.log('Processing all pairs');
        const allPairs = this.pairManager.getAllPairs(); // Get all pairs from PairManager
        const results = new Array(allPairs.length); // Initialize results array to map the order of the pairs

        for (const pair of allPairs) {
            try {
                const result = await this.processPair(pair);
                if (result) {
                    const index = allPairs.indexOf(pair); // Use the index to maintain order
                    results[index] = result; // Store result
                    this.botDataLogger[pair.key] = result; // Update botDataLogger with the latest result
                    console.log('\n');
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
            if (this.config.printTable) this.tablePrinter.print(results); // Use the TablePrinter instance to print the table
            if (this.config.saveData) saveData(this.botDataLogger, 'final_data.json');
            //
            //console.time('Delay round');
            if (this.config.loopDelay) await this.wait(this.config.loopDelay);
            //console.timeEnd('Delay round');
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
            if (this.config.shouldResynch) this.resynchronizeTime();
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
(async () => {
    const bot = new TradingBot();
    await bot.init();
    bot.startBot();
})();

/*
async processPair(pair) {
    console.log('\x1b[33mProcessing\x1b[0m', pair.key);
    pair.joinedPair = pair.key.replace('_', '');

    try {
        // 1. Data Fetching
        const { ohlcvData, orders, currentPrice } = await this.fetchPairData(pair);
        if (!ohlcvData) return null; // Error already logged in fetchPairData

        // 2. Indicator Calculation
        const indicators = await this.calculateIndicators(ohlcvData);

        // 3. Market Analysis
        const analysis = this.analyzeMarket(ohlcvData, indicators);

        // 4. Notification & Trading
        this.sendGroupChatAlert(pair.key, analysis);
        if (pair.tradeable && currentPrice) {
            await this.trade(pair, currentPrice, orders || [], analysis);
        }

        return this.formatResult(pair, indicators, analysis, orders, currentPrice);

    } catch (error) {
        console.error('Error processing pair:', pair.key, error);
        return null;
    }
}

// --- Helper Methods --- //

async fetchPairData(pair) {
    try {
        const [ohlcv1H, ohlcv4H, orders, currentPrice] = await Promise.all([
            this.makeQueuedReq(klines, pair.joinedPair, '1h'),
            this.makeQueuedReq(klines, pair.joinedPair, '4h'),
            pair.tradeable ? this.makeQueuedReq(fetchMyOrders, pair.joinedPair) : [],
            pair.tradeable ? this.makeQueuedReq(tickerPrice, pair.joinedPair) : null
        ]);

        if (ohlcv1H.error || ohlcv4H.error) {
            console.error('OHLCV error:', ohlcv1H.error || ohlcv4H.error);
            return { ohlcvData: null };
        }

        return {
            ohlcvData: { '1h': ohlcv1H, '4h': ohlcv4H },
            orders,
            currentPrice: currentPrice?.price
        };
    } catch (error) {
        console.error('Error fetching data for pair:', pair.key, error);
        return { ohlcvData: null };
    }
}

async calculateIndicators(ohlcvData) {
    try {
        const [indicators1H, indicators4H] = await Promise.all([
            getIndicators(ohlcvData['1h']),
            getIndicators(ohlcvData['4h'])
        ]);
        return { '1h': indicators1H, '4h': indicators4H };
    } catch (error) {
        console.error('Error calculating indicators:', error);
        throw error; // Rethrow for parent catch
    }
}

analyzeMarket(ohlcvData, indicators) {
    return analyzeMultipleTimeframes(
        indicators,
        ohlcvData,
        {
            analysisWindow: this.config.analysisWindow,
            primaryTimeframe: this.config.klinesInterval,
            weights: { '1h': 1, '4h': 2 }
        }
    );
}

formatResult(pair, indicators, analysis, orders, currentPrice) {
    return {
        ...pair,
        indicators,
        analysis,
        orders,
        currentPrice,
        date: new Date().toLocaleString()
    };
}
*/