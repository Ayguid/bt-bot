require('dotenv').config(); // env config
const { klines } = require('./scripts/binance-spot-2.js');
const { Table  } = require('console-table-printer');
const { getIndicators } = require('./utils/indicators.js');
const { analyzeCandles, buyApproval, sellApproval, shouldBuyOrSell} = require('./utils/trendCalcs.js');
//https://github.com/yagop/node-telegram-bot-api
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const tBot = new TelegramBot(token, {polling: true});
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUPCHAT_ID;
const BUY_ALERT_CONFIG = true;
const SELL_ALERT_CONFIG = true;
//https://api.telegram.org/bot<YourBOTToken>/getUpdates
//https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id
//
//LOOP'S vars
let EXIT_LOOP = true;
const DELAY = 5000; //dont go under 2500
let PAIRS_LOOP_INDEX = 0; //method used to request large numbers of pairs withous flooding the api
const PAIRS = [ //method used to request large numbers of pairs withous flooding the api,,, array of arrays
    ['BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'FET_USDT', 'TURBO_USDT', 'FIO_USDT'], //wait 4500ms
    ['ICP_USDT', 'BNX_USDT', 'KP3R_USDT', 'AVAX_USDT', 'APE_USDT', 'MATIC_USDT'], //wait 4500ms
    ['FLOKI_USDT', 'PEPE_USDT', 'WIF_USDT', 'BONK_USDT', 'FTM_USDT', 'WING_USDT'], //wait 4500ms
    ['COTI_USDT', '1INCH_USDT', 'LINK_USDT', 'BURGER_USDT', 'BLZ_USDT', 'HIGH_USDT'], //wait 4500m
];

//
tBot.on('message', (msg) => {
    // send a message to the chat acknowledging receipt of their message
    console.log(msg);
    if(msg.from.id == process.env.TELEGRAM_MY_ID) {
        if(msg.text == 'start'){startBot()}
        if(msg.text == 'stop'){stopBot()}
    }
    tBot.sendMessage(msg.chat.id, `Received your message '${msg.text}'`);
});
/*
// Matches /love
bot.onText(/\/love/, function onLoveText(msg) {
    const opts = {
      reply_to_message_id: msg.message_id,
      reply_markup: JSON.stringify({
        keyboard: [
          ['Yes, you are the bot of my life ❤'],
          ['No, sorry there is another one...']
        ]
      })
    };
    bot.sendMessage(msg.chat.id, 'Do you love me?', opts);
});
*/

const startBot = () => {
    if (!EXIT_LOOP) { return }//Prevent restart
    console.log('\x1b[33m%s\x1b[0m', 'Starting bot');
    EXIT_LOOP = !EXIT_LOOP;
    botLoop();
}
const stopBot = () => {
    if (EXIT_LOOP) { return }//Prevent restop
    console.log('\x1b[33m%s\x1b[0m', 'Stopping bot');
    EXIT_LOOP = !EXIT_LOOP;
}

//
const wait = async ms => new Promise(resolve => setTimeout(resolve, ms));
//
const botLoop =  async () =>  {
    while(!EXIT_LOOP){
        let promiseArray = []; // array of promises used to wait unti forLoop finishes reqs for each pair
        let tableRowsArray = [];
        PAIRS[PAIRS_LOOP_INDEX].forEach((pair) => {
            const joinedPair = pair.split("_").join(''); //ETH_USDT to ETHUSDT, we mantain the _ for later use in binance dir
            promiseArray.push(new Promise(async (resolve, reject) => {
                const ohlcv = await klines(joinedPair, '2h');
                if (!ohlcv) {
                    console.log('Failed to fetch data or data is not available.');
                    reject();
                    return;
                }
                //
                const indicators = await getIndicators(ohlcv);
                const trend = analyzeCandles(ohlcv, 12);// To calculate the 24-hour trend with 2-hour candles, pass 12 as the analysis window
                const shouldBuy = buyApproval(indicators);
                const shouldSell = sellApproval(indicators);
                const signal = shouldBuyOrSell(indicators); //remix of 2 above  
                tableRowsArray.push({
                    pair,
                    shouldBuy,
                    shouldSell,
                    indicators,
                    trend,
                    signal         
                });
                //
                if (shouldBuy) {
                    console.log('Buy Signal Triggered!', pair);
                    if(BUY_ALERT_CONFIG) tBot.sendMessage(GROUP_CHAT_ID, `Should buy https://www.binance.com/en/trade/${pair}?type=spot`, { parse_mode: "HTML", disable_web_page_preview: true });// this is why we mantian the pair with the underscore _
                } else if (shouldSell) {
                    console.log('Sell Signal Triggered!', pair);
                    if(SELL_ALERT_CONFIG) tBot.sendMessage(GROUP_CHAT_ID, `Should sell https://www.binance.com/en/trade/${pair}?type=spot`, { parse_mode: "HTML", disable_web_page_preview: true });// this is why we mantian the pair with the underscore _
                } else {
                    //console.log('No trade signal.');
                }
                resolve();
            }));
        });
        //
        //still needs error handling for each request, reconnect, and time resync, due to servertime and local time offset
        await Promise.all(promiseArray).then(async () => {
            //print table
            printTable(tableRowsArray);
            //
            PAIRS_LOOP_INDEX++;
            if(PAIRS_LOOP_INDEX >= PAIRS.length) {
                PAIRS_LOOP_INDEX = 0; 
                console.log('\x1b[33m%s\x1b[0m', '<<------------------------>>');
            }  
        }).catch(error => {
            console.log(error);
        });
        await wait(DELAY);
    }
}


const printTable = (dataArray)=>{
    const p = new Table({
        columns: [
            { name: 'pair', alignment: 'left', color: 'blue' }, // with alignment and color
            { name: 'shouldBuy', title: 'BUY', alignment: 'right', color: 'custom_green' },
            { name: 'shouldSell', title: 'SELL', color: 'red'}, // with Title as separate Text,
            { name: 'rsi', title: 'rsi', color: 'yellow'}, // with Title as separate Text,
            { name: 'stoch_rsi', title: 'stoch rsi', color: 'yellow'}, // with Title as separate Text,
            { name: 'macd', title: 'macd', color: 'yellow'}, // with Title as separate Text,
            { name: 'ema', title: 'ema', color: 'yellow'}, // with Title as separate Text,
            { name: 'adx', title: 'adx', color: 'yellow'}, // with Title as separate Text,
            { name: 'ao', title: 'ao', color: 'yellow'}, // with Title as separate Text,
            { name: 'atr', title: 'atr', color: 'yellow'}, // with Title as separate Text,
            { name: 'priceTrend', title: 'Price trend'}, // with Title as separate Text,
            { name: 'volumeTrend', title: 'Vol trend'}, // with Title as separate Text,
            { name: 'signal', title: 'signal'}
        ],
        colorMap: {
            custom_green: '\x1b[32m', // define customized color
        },
    }); 
    dataArray.map(element=> p.addRow(
        { 
            pair: element.pair, 
            shouldBuy: element.shouldBuy || '-', 
            shouldSell: element.shouldSell || '-', 
            rsi: element.indicators?.CURRENT_RSI.toFixed(2),
            stoch_rsi: element.indicators?.CURRENT_STOCH_RSI?.k?.toFixed(2),
            macd: element.indicators?.CURRENT_MACD?.histogram.toFixed(4),
            ema: element.indicators?.CURRENT_EMA.toFixed(4),
            adx: element.indicators?.CURRENT_ADX?.adx.toFixed(4),             
            ao: element.indicators?.CURRENT_AO,                        
            atr: element.indicators?.CURRENT_ATR.toFixed(4),                        
            priceTrend: element?.trend.priceTrend,             
            volumeTrend: element?.trend.volumeTrend,
            signal: element?.signal,
        },{ color: element?.trend.priceTrend == 'Bullish' || element?.signal == 'Buy' ? 'green': element?.trend.priceTrend == 'Bearish' || element?.signal == 'Sell'? 'red': '' }
    ));
    p.printTable();
}


startBot();