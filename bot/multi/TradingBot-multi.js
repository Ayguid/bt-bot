require('dotenv').config(); // Environment variables
// Node.js built-in modules
const path = require('path');
const crypto = require("crypto");
// Local project modules
const { klines, fetchMyOrders, tickerPrice, userAsset, fetchMyAccount, placeOrder, cancelOrder, cancelAndReplace, exchangeInfo } = require('../../utils/binance-spot');
const { getIndicators } = require('../../analysis/multi/indicators-multi');
const MarketAnalyzer = require('../../analysis/multi/MarketAnalyzer');
const { saveData } = require('../../utils/fileManager');
const RateLimitedQueue = require('../../classes/RateLimitedQueue');
const TablePrinter = require('./TablePrinter-multi');
const TelegramBotHandler = require('./TelegramBotHandler-multi');
const PairManager = require('../PairManager');
const { plusPercent, minusPercent, calculateProfit, timePassed, wait } = require('../../utils/helpers');
const config = require('../../config'); // Configuration file
//server visualize
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
//
const TimeManager = require('./timeManager');
//
class TradingBot {
    //ORDER_SIDES
    static BUY = 'BUY';
    static SELL = 'SELL';
    //ORDER_STATUS
    static FILLED = 'FILLED';
    static PARTIALLY_FILLED = 'PARTIALLY_FILLED';
    static CANCELED = 'CANCELED';
    static NEW = 'NEW';
    static EXPIRED = 'EXPIRED';
    //
    static STRONG_BUY = 'STRONG_BUY';
    static STRONG_SELL = 'STRONG_SELL';
    //
    constructor() {
        this.config = config; // Use the imported config
        this.queue = new RateLimitedQueue(1100, 1800, 20);
        this.tablePrinter = new TablePrinter();
        this.botDataLogger = {};
        this.exchangeInfo = {};
        this.pairManager = new PairManager(path.join(__dirname, '..', '../pairs-multi.json'));// Initialize the PairManager with the path to the pairs file
        this.telegramBotHandler = new TelegramBotHandler(this.config, this.executeCommand.bind(this));// Initialize the Telegram bot handler with a callback to handle commands
        this.setupVisualizationServer(); //init server for display
        this.timeManager = new TimeManager(this.config, this.makeQueuedReq.bind(this)); //// Initialize TimeManager Pass the queued request method
        this.timeManager.startTimeCheck();// Start time checks
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
    setupVisualizationServer() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        // Serve static files
        this.app.use(express.static(path.join(__dirname, '../../public')));
        // Socket.io connection handler
        this.io.on('connection', (socket) => {
          console.log('New client connected');
          socket.emit('initial-data', this.botDataLogger);
        });
        
        this.server.listen(3000, () => {
          console.log('Visualization server running on http://localhost:3000');
        });
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

    sendGroupChatAlert(pair, analysis) {
        // Delegate alert sending to the Telegram bot handler
        this.telegramBotHandler.sendGroupChatAlert(pair, analysis);
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

    getVolatilityAssessment(candles, period = 20) {
        if (!candles || candles.length < period) return 0;
        
        const priceChanges = candles.slice(-period).map((c, i, arr) => 
            i > 0 ? Math.abs(c[4] - arr[i-1][4]) / arr[i-1][4] : 0
        );
        
        const atr = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
        return parseFloat((atr * 100).toFixed(2)); // Return as percentage
    }

    getDynamicStopLoss(pair, entryPrice, currentPrice, analysis) {
        console.log('\x1b[33m%s\x1b[0m', `\n=== Calculating Dynamic Stop for ${pair.key} ===`);
        
        // 1. Base stop from configuration with fallback
        let stopPercentage = pair.okLoss || -2; // Default to -2% if not set
        console.log(`- Base Stop: ${stopPercentage}%`);
    
        // 2. Volatility adjustment with fallback
        const candles = (analysis.candles && analysis.candles['1h']) || [];
        const volatility = this.getVolatilityAssessment(candles);
        const volatilityFactor = 1 + (volatility / 50);
        console.log(`- Volatility: ${volatility}% → Factor: ${volatilityFactor.toFixed(2)}`);
    
        // 3. Trend strength adjustment with fallback
        const trendConfidence = (analysis.trend && analysis.trend.confidence) ? analysis.trend.confidence : "MEDIUM";
        const trendFactor = trendConfidence === "HIGH" ? 0.7 : 
                          trendConfidence === "LOW" ? 1.3 : 1.0;
        console.log(`- Trend Confidence: ${trendConfidence} → Factor: ${trendFactor}`);
    
        // 4. Current P/L adjustment
        const currentPL = calculateProfit(currentPrice, entryPrice);
        const plFactor = currentPL < -1 ? 1.2 : 1.0;
        console.log(`- Current P/L: ${currentPL.toFixed(2)}% → Factor: ${plFactor}`);
    
        // Calculate adjusted stop
        stopPercentage *= volatilityFactor * trendFactor * plFactor;
        
        // Apply absolute limits
        stopPercentage = Math.max(stopPercentage, pair.maxStopLoss || -5); // Max -5% unless configured
        stopPercentage = Math.min(stopPercentage, -0.3); // Never less than -0.3%
        
        const stopPrice = entryPrice * (1 + (stopPercentage/100));
        
        console.log(`- Final Dynamic Stop: ${stopPercentage.toFixed(2)}% (${stopPrice.toFixed(4)})`);
        // const currentProfit = calculateProfit(currentPrice, previousOrder.price);
        console.log('- Entry price', entryPrice);
        //console.log(`- Profit is: ${currentPL} %`);
        return {
            percentage: parseFloat(stopPercentage.toFixed(2)),
            price: stopPrice
        };
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
    
    async trade(pair, currentPrice, orders, analysis) {
        if (!pair || !currentPrice || !orders || !analysis) {
            console.error('Missing trading parameters');
            return;
        }

        console.log('\x1b[32mTrading\x1b[0m', pair.key, 'at', currentPrice);

        const buyIsApproved = analysis.consensusSignal === TradingBot.BUY || analysis.consensusSignal === TradingBot.STRONG_BUY;
        const sellIsApproved = analysis.consensusSignal === TradingBot.SELL || analysis.consensusSignal === TradingBot.STRONG_SELL;

        if (!Array.isArray(orders) || orders.length === 0) {
            console.log('No existing orders - evaluating new trade');
            await this.considerNewOrder(pair, false, currentPrice, buyIsApproved, sellIsApproved);
            return;
        }

        const sortedOrders = [...orders].sort((a, b) => new Date(b.time) - new Date(a.time));
        const [lastOrder, previousOrder] = sortedOrders.slice(0, 2);

        switch (lastOrder.status) {
            case TradingBot.FILLED:
                await this.handleFilledOrder(pair, lastOrder, currentPrice, buyIsApproved, sellIsApproved, analysis);
                break;
            case TradingBot.PARTIALLY_FILLED:
                await this.handlePartiallyFilledOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved, analysis);
                break;
            case TradingBot.NEW:
                await this.monitorPendingOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved, analysis);
                break;
            case TradingBot.CANCELED:
            case TradingBot.EXPIRED:
                await this.considerNewOrder(pair, lastOrder, currentPrice, buyIsApproved, sellIsApproved);
                break;
            default:
                console.log('Unhandled order status:', lastOrder.status);
        }
    }

    async handleFilledOrder(pair, lastOrder, currentPrice, buyIsApproved, sellIsApproved, analysis) {
        if (lastOrder.side === TradingBot.BUY) {
            const dynamicStop = this.getDynamicStopLoss(
                pair, 
                lastOrder.price, 
                currentPrice, 
                analysis
            );
            
            console.log(`🛡️ Active Stop for ${pair.key}: ` +
                `${dynamicStop.percentage}% below ${lastOrder.price}`);
        }
        
        if (lastOrder.side === TradingBot.SELL && buyIsApproved) {
            console.log('Last sell order filled. Conditions favorable for buying.');
            await this.placeBuyOrder(pair, currentPrice);
        } else if (lastOrder.side === TradingBot.BUY) {
            console.log('Last buy order filled. Conditions favorable for selling.');
            await this.placeSellOrder(pair, lastOrder);
        } else {
            console.log('Filled order exists, but current conditions not favorable for new order.');
        }
    }

    async handlePartiallyFilledOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved, analysis) {
        console.log(`Order for ${pair.key} is partially filled. Filled amount: ${lastOrder.executedQty}`);
        
        const waited_time = timePassed(new Date(lastOrder.updateTime)) / 3600; // to convert secs to hrs, divide by 3600
        console.log('Time waiting: ', waited_time);

        const remainingQty = lastOrder.origQty - lastOrder.executedQty;
        console.log(`Remaining quantity to be filled: ${remainingQty}`);

        if (lastOrder.side === TradingBot.BUY) {
            if (buyIsApproved) {
                const orderPriceDiff = calculateProfit(currentPrice, lastOrder.price);
                console.log(`Price diff with order is: ${orderPriceDiff} %`);
                if (orderPriceDiff >= pair.profitMgn) {
                    console.log(`Conditions no longer ok, price went up by ${orderPriceDiff}, Selling what was bought,,, %`);
                    await this.cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice, true);
                } else {
                    console.log('Conditions still favorable for buying. Keeping the order open.');
                }
            } else {
                console.log('Conditions no longer favorable for buying. Consider cancelling remaining order.');
            }
        } else if (lastOrder.side === TradingBot.SELL) {
            const dynamicStop = this.getDynamicStopLoss(
                pair,
                previousOrder.price,
                currentPrice,
                analysis
            );
            // console.log(`📉 Current Price: ${currentPrice} | Stop: ${dynamicStop.price}`);
            // const currentProfit = calculateProfit(currentPrice, previousOrder.price);
            // console.log(`Profit is: ${currentProfit} %`);
            if (currentPrice <= dynamicStop.price) {
                console.log(`❗ Stop Loss Triggered at ${dynamicStop.percentage}%`);
                await this.cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice, true);
            } else if (sellIsApproved) {
                console.log('Conditions still favorable for selling. Keeping the order open.');
            } else if (currentProfit <= pair.okLoss) {
                console.log(`Selling at current price, too much loss.`);
                await this.cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice, true);
            } else {
                console.log('Conditions no longer favorable for selling. Consider cancelling remaining order.');
            }
        }
    }

    async monitorPendingOrder(pair, lastOrder, previousOrder, currentPrice, buyIsApproved, sellIsApproved, analysis) {
        console.log('\x1b[32m%s\x1b[0m', 'Current price', currentPrice);
        console.log(
            `Monitoring pending ${lastOrder.side},
            order for ${pair.key}, 
            orderId: ${lastOrder.orderId}, 
            Order Price: ${lastOrder.price},
            Order Qty: ${lastOrder.origQty}
            `
        );

        // maybe add in partially filled
        const minHoldHours = 1; //in hours, Minimum time to hold before considering stops
        const holdTimeHours = timePassed(new Date(lastOrder.updateTime)) / 3600;
        if (holdTimeHours < minHoldHours) {
            console.log(`Holding position (${holdTimeHours.toFixed(1)}h/${minHoldHours}h minimum)`);
            return;
        }
        
        if (lastOrder.side == TradingBot.SELL) {
            const dynamicStop = this.getDynamicStopLoss(
                pair,
                previousOrder.price,
                currentPrice,
                analysis
            );

            if (currentPrice <= dynamicStop.price) {
                console.log(`🔴 STOP LOSS HIT (${dynamicStop.percentage}%)`);
                await this.cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice);
            }
        } else if (lastOrder.side == TradingBot.BUY) {
            const orderPriceDiff = calculateProfit(currentPrice, lastOrder.price);
            console.log(`Price diff with order is: ${orderPriceDiff} %`);
            if (!buyIsApproved || orderPriceDiff >= pair.okDiff) {
                console.log(`Cancelling Buy Order, conditions no longer ok, price went up by ${orderPriceDiff} %`);
                await this.cancelOrder(pair, lastOrder);
            }
        }
    }

    async considerNewOrder(pair, lastOrder = false, currentPrice, buyIsApproved, sellIsApproved) {
        if (buyIsApproved) {
            console.log('Conditions favorable for placing a buy order');
            await this.placeBuyOrder(pair, currentPrice);
        } else if (sellIsApproved) {
            console.log('Conditions favorable for placing a sell order');
        } else {
            console.log('Current conditions not favorable for placing a new order');
        }
    }

    async placeBuyOrder(pair, currentPrice) {
        console.log(`Placing buy order for ${pair.key}`);
        const balances = await this.getBalances(pair.key);
        const quoteAsset = balances[1];
        if (quoteAsset.free < pair.orderQty) {
            console.warn('Not enough balance to place buy order.');
            return;
        }
        const filters = this.exchangeInfo.symbols.find(symbol => symbol.symbol == pair.joinedPair).filters;
        const priceDecimals = this.getDecimals(filters.find(f => f.filterType === 'PRICE_FILTER').tickSize);
        const qtyDecimals = this.getDecimals(filters.find(f => f.filterType === 'LOT_SIZE').stepSize);
        
        const buyPrice = minusPercent(pair.belowPrice, currentPrice).toFixed(priceDecimals);
        const qty = (pair.orderQty / buyPrice).toFixed(qtyDecimals);
        const order = await this.makeQueuedReq(placeOrder, pair.joinedPair, TradingBot.BUY, 'LIMIT', { price: buyPrice, quantity: qty, timeInForce: 'GTC', newClientOrderId: this.newBotOrderId() });
        return order;
    }

    async placeSellOrder(pair, lastOrder) {
        console.log(`Placing sell order for ${pair.key}`);
        const balances = await this.getBalances(pair.key);
        const baseAsset = balances[0];
        if (baseAsset.free <= 0) {
            console.warn('Not enough balance to place sell order.');
            return;
        }
        
        const filters = this.exchangeInfo.symbols.find(symbol => symbol.symbol == pair.joinedPair).filters;
        const priceDecimals = this.getDecimals(filters.find(f => f.filterType === 'PRICE_FILTER').tickSize);
        const sellPrice = plusPercent(pair.profitMgn, lastOrder.price).toFixed(priceDecimals);
        
        const qty = lastOrder.executedQty;
        const order = await this.makeQueuedReq(placeOrder, pair.joinedPair, TradingBot.SELL, 'LIMIT', { price: sellPrice, quantity: qty, timeInForce: 'GTC', newClientOrderId: this.newBotOrderId() });
        return order;
    }

    async cancelOrder(pair, lastOrder) {
        const order = await this.makeQueuedReq(cancelOrder, pair.joinedPair, lastOrder.orderId);
        return order;
    }

    async cancelAndSellToCurrentPrice(pair, lastOrder, currentPrice, partial=false) {
        console.log('Cancelling and Selling to current price.');
        const qty = partial ? lastOrder.executedQty : lastOrder.origQty;
        const order = await this.makeQueuedReq(cancelAndReplace, pair.joinedPair, TradingBot.SELL, 'LIMIT', { cancelOrderId: lastOrder.orderId, quantity: qty, price: currentPrice, timeInForce: 'GTC' });
        return order;
    }

    async fetchPairData(pair) {
        return Promise.all([
            this.makeQueuedReq(klines, pair.joinedPair, '1h'),
            this.makeQueuedReq(klines, pair.joinedPair, '4h'),
            pair.tradeable ? this.makeQueuedReq(fetchMyOrders, pair.joinedPair) : [],
            pair.tradeable ? this.makeQueuedReq(tickerPrice, pair.joinedPair) : null
        ]);
    }

    analyzePairData(ohlcv1H, ohlcv4H) {
        const minLength = Math.min(ohlcv1H.length, ohlcv4H.length);
        const synced1H = ohlcv1H.slice(-minLength);
        const synced4H = ohlcv4H.slice(-minLength);
        
        const indicators1H = getIndicators(synced1H);
        const indicators4H = getIndicators(synced4H);
        
        const analysis = MarketAnalyzer.analyzeMultipleTimeframes(
            { '1h': indicators1H, '4h': indicators4H },
            { '1h': synced1H, '4h': synced4H },
            {
                analysisWindow: this.config.analysisWindow,
                primaryTimeframe: this.config.klinesInterval,
                weights: { '1h': 1, '4h': 2 }
            }
        );
        
        analysis.candles = { '1h': synced1H, '4h': synced4H };
        
        return { analysis, indicators1H, indicators4H };
    }

    createPairResult(pair, indicators1H, indicators4H, analysis, orders, currentPrice) {
        return {
            ...pair,
            indicators: { '1h': indicators1H, '4h': indicators4H },
            analysis,
            orders,
            currentPrice: currentPrice?.price,
            date: new Date().toLocaleString()
        };
    }

    async processPair(pair) {
        console.log('\x1b[33mProcessing\x1b[0m', pair.key);
        pair.joinedPair = pair.key.replace('_', '');

        try {
            // Fetch data for multiple timeframes
            const [ohlcv1H, ohlcv4H, orders, currentPrice] = await this.fetchPairData(pair);

            // Error handling
            if (ohlcv1H.error || ohlcv4H.error) {
                console.error('OHLCV error:', ohlcv1H.error || ohlcv4H.error);
                return null;
            }
            
            const { analysis, indicators1H, indicators4H } = this.analyzePairData(ohlcv1H, ohlcv4H);
      
            // Send alerts and execute trades
            const normalizedSignal = analysis.consensusSignal.toLowerCase();
            if (['buy', 'sell', 'strong_buy', 'strong_sell'].includes(normalizedSignal) && this.config.telegramBotEnabled) this.sendGroupChatAlert(pair.key, analysis);

            if (pair.tradeable && currentPrice?.price) {
                await this.trade(pair, currentPrice.price, orders || [], analysis);
            }
            
            return this.createPairResult(pair, indicators1H, indicators4H, analysis, orders, currentPrice);

        } catch (error) {
            console.error('Error processing pair:', pair.key, error);
            return null;
        }
    }

    async getBalances(pair) {
        const assetKey = pair.split("_")[0];
        const stableKey = pair.split("_")[1];
        console.log(assetKey, stableKey);
        const TESTNET = process.env.TESTNET == 'true';
        let baseAsset;
        let quoteAsset;
        if (TESTNET) {
            const wallet = await this.makeQueuedReq(fetchMyAccount);
            baseAsset = wallet.balances.find(asset => asset.asset == assetKey)
            quoteAsset = wallet.balances.find(asset => asset.asset == stableKey)
        } else {
            [baseAsset, quoteAsset] = await Promise.all([
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
        const allPairs = this.pairManager.getAllPairs();
        const results = new Array(allPairs.length);

        for (const pair of allPairs) {
            try {
                const result = await this.processPair(pair);
                if (result) {
                    const index = allPairs.indexOf(pair);
                    results[index] = result;
                    this.botDataLogger[pair.key] = result;
                    console.log('\n');
                }
                if (this.config.pairDelay) await wait(3000);
            } catch (error) {
                console.error(`Error processing ${pair}:`, error);
            }
        }
        // Emit updated data
        if (this.io) {
            this.io.emit('data-update', this.botDataLogger);
        }
        return results;
    }


    async botLoop() {
        while (this.config.isRunning) {
            console.time('Processing round');
            const results = await this.processAllPairs();
            console.timeEnd('Processing round');
            
            if (this.config.printTable) this.tablePrinter.print(results);
            if (this.config.saveData) saveData(this.botDataLogger, 'final_data.json');
            
            if (this.config.loopDelay) await wait(this.config.loopDelay);
        }
    }

}

// Usage
(async () => {
    const bot = new TradingBot();
    await bot.init();
    bot.startBot();
})();
