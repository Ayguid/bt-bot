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
