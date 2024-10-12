//require('dotenv').config(); // env config
const { klines } = require('./scripts/binance-spot-2.js');
const { Table  } = require('console-table-printer');
const { getIndicators } = require('./utils/indicators.js');
//const { timePassed } = require('./utils/helpers.js');
//
//https://github.com/yagop/node-telegram-bot-api
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const tBot = new TelegramBot(token, {polling: true});
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUPCHAT_ID;
const BUY_ALERT_CONFIG = false;
const SELL_ALERT_CONFIG = false;
//const WAIT_TIME_NXT_MSG = 45;
//let timeLastBuyMsg = new Date();
//https://api.telegram.org/bot<YourBOTToken>/getUpdates
//https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id
//
//LOOP'S vars
let EXIT_LOOP = true;
const DELAY = 5000; //dont go under 2500
let PAIRS_LOOP_INDEX = 0; //method used to request large numbers of pairs withous flooding the api
const PAIRS = [ //method used to request large numbers of pairs withous flooding the api,,, array of arrays
    ['BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'FET_USDT', 'XLM_USDT', 'STX_USDT'], //wait 4500ms
    ['FLOKI_USDT', 'PEPE_USDT', 'WIF_USDT', 'BONK_USDT', 'FTM_USDT', 'WING_USDT'], //wait 4500ms
    //['COTI_USDT', 'REZ_USDT', 'DOCK_USDT', 'LQTY_USDT', 'BLZ_USDT', 'HIGH_USDT'], //wait 4500ms
    //['MOVR_USDT', 'ARK_USDT', 'ADX_USDT', 'OMNI_USDT', 'FET_USDT', 'FIL_USDT'], //wait 4500ms
    //['SAND_USDT', 'ARB_USDT', 'RUNE_USDT', 'INJ_USDT', 'CHZ_USDT', 'AGLD_USDT'], //wait 4500ms
    //['SNX_USDT', 'OCEAN_USDT', 'AXS_USDT', '1INCH_USDT', 'FARM_USDT', 'LINK_USDT'], //wait 4500ms
    //['ICP_USDT', 'BNX_USDT', 'KP3R_USDT', 'AVAX_USDT', 'APE_USDT', 'MATIC_USDT'], //wait 4500ms
    //['BICO_USDT', 'DUSK_USDT', 'TRX_USDT', 'AERGO_USDT', 'PYR_USDT', 'CAKE_USDT'], //wait 4500ms
    //['TRU_USDT', 'LEVER_USDT', 'BURGER_USDT', 'ROSE_USDT', 'AVA_USDT', 'JASMY_USDT'] //wait 4500ms
];

//
tBot.on('message', (msg) => {
    // send a message to the chat acknowledging receipt of their message
    console.log(msg);
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
        let rowsArray = [];
        PAIRS[PAIRS_LOOP_INDEX].forEach((pair) => {
            const joinedPair = pair.split("_").join(''); //ETH_USDT to ETHUSDT, we mantain the _ for later use in binance dir
            promiseArray.push(new Promise(async (resolve, reject) => {
                const ohlcv = await klines(joinedPair, '2h');
                if (!ohlcv) {
                    console.log('Failed to fetch data or data is not available.');
                    reject();
                    return;
                }
                const indicators = await getIndicators(ohlcv);
                const shouldBuy = buyApproval(indicators);
                const shouldSell = sellApproval(indicators);
                rowsArray.push({
                    symbol: pair,
                    should_buy: shouldBuy || '-',
                    should_sell: shouldSell || '-',
                    stoch_rsi: indicators?.CURRENT_STOCH_RSI?.k?.toFixed(2),            
                    macd: indicators?.CURRENT_MACD?.histogram.toFixed(10),
                    adx: indicators?.CURRENT_ADX?.adx.toFixed(4),             
                    ao: indicators?.CURRENT_AO,             
                });
                //
                if (shouldBuy) {
                    console.log('Buy Signal Triggered!', pair);
                    //const timeWaited = timePassed(new Date(timeLastBuyMsg));
                    //if(timeWaited >= WAIT_TIME_NXT_MSG){
                        //timeLastBuyMsg = new Date();
                    if(BUY_ALERT_CONFIG) tBot.sendMessage(GROUP_CHAT_ID, `Should buy https://www.binance.com/en/trade/${pair}?type=spot`, { parse_mode: "HTML", disable_web_page_preview: true });// this is why we mantian the pair with the underscore _
                    //}
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
            const p = new Table({
                columns: [
                    { name: 'symbol', alignment: 'left', color: 'blue' }, // with alignment and color
                    { name: 'should_buy', title: 'BUY', alignment: 'right', color: 'custom_green' },
                    { name: 'should_sell', title: 'SELL', color: 'red'}, // with Title as separate Text,
                    { name: 'stoch_rsi', title: 'stoch rsi', color: 'yellow'}, // with Title as separate Text,
                    { name: 'macd', title: 'macd', color: 'yellow'}, // with Title as separate Text,
                    { name: 'adx', title: 'adx', color: 'yellow'}, // with Title as separate Text,
                    { name: 'ao', title: 'ao', color: 'yellow'}, // with Title as separate Text,
                ],
                colorMap: {
                    custom_green: '\x1b[32m', // define customized color
                },
                rows: rowsArray,
            });
            p.printTable();
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

const buyApproval = (indicators) => {
    const STOCH_BUY_LIMIT = 35; //30
    const MACD_BUY_LIMIT = 0;
    const macdCrossUp = (indicators.macd && indicators.macd.length > 1) ? indicators.macd[indicators.macd.length - 1].histogram > MACD_BUY_LIMIT && indicators.macd[indicators.macd.length - 2].histogram <= MACD_BUY_LIMIT : false;
    const stochRSIOK = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k < STOCH_BUY_LIMIT : false;
    //const aoPositive = indicators.ao[indicators.ao.length - 1] > 0;
    //const adxStrong = indicators.adx[indicators.adx.length - 1].adx > 20;
    //return macdCrossUp && stochRSIOK && aoPositive && adxStrong;
    return macdCrossUp && stochRSIOK; 
}


const sellApproval = (indicators) =>{
    const STOCH_SELL_LIMIT = 78; //60
    const MACD_SELL_LIMIT = 0;
    const macdCrossDown = (indicators.macd && indicators.macd.length > 1) ? indicators.macd[indicators.macd.length - 1].histogram < MACD_SELL_LIMIT && indicators.macd[indicators.macd.length - 2].histogram >= MACD_SELL_LIMIT : false;
    const stochRSIOverbought = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_SELL_LIMIT : false;
    //const aoNegative = indicators[indicators.ao.length - 1] < 0;
    //const adxStrong = indicators.adx[indicators.adx.length - 1].adx > 20;
    //return macdCrossDown && stochRSIOverbought && aoNegative && adxStrong;
    return macdCrossDown && stochRSIOverbought;
}

startBot();