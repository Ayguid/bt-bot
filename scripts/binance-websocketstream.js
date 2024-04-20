'use strict'
const apiKey = process.env.BINANCE_API_KEY || ''
const apiSecret = process.env.BINANCE_API_SECRET || ''

const { Console } = require('console')
const {WebsocketStream} = require('@binance/connector')

const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

const callBacksMsg = (data) => {
    const CURRENT_PRICE = JSON.parse(data).data.p;
    logger.info(CURRENT_PRICE);
}

// START STREAM
const callbacks = {
  open: () => logger.debug('Connected with Websocket server'),
  close: () => logger.debug('Disconnected with Websocket server'),
  message: callBacksMsg
}
const websocketStreamClient = new WebsocketStream({ logger, callbacks, combinedStreams: true })
websocketStreamClient.trade('btcusdt');
// close websocket stream after 6 sec
setTimeout(() => websocketStreamClient.disconnect(), 6000)












/* 
while (true) {
    if(CURRENT_PRICE > ATH) console.log('yey');
    else console.log('ney');
}
*/
//websocketStreamClient.kline('btcusdt', '1m')
//websocketStreamClient.miniTicker('btcusdt')


/*
const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

ws.onmessage = (event) => {
    let stockObject = JSON.parse(event.data);
    console.log(stockObject.p)
}
*/

/*
const {Spot} = require('@binance/connector')
const fs = require('fs')
const { Console } = require('console')

// make sure the logs/ folder is created beforehand
const output = fs.createWriteStream('./logs/stdout.log')
const errorOutput = fs.createWriteStream('./logs/stderr.log')

const logger = new Console({ stdout: output, stderr: errorOutput })
const client = new Spot('', '', {logger: logger})

client.exchangeInfo().then(response => client.logger.log(response.data))
*/



/*
const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
ws.on('message', function incoming(data) {
    console.log(data);
});
*/

/*
const { Spot } = require('@binance/connector')

const apiKey = process.env.BINANCE_API_KEY || ''
const apiSecret = process.env.BINANCE_API_SECRET || ''

const client = new Spot(apiKey, apiSecret)

// Get account information
client.account().then(response => client.logger.log(response.data))
*/

/*

'use strict'

const { Console } = require('console')
const {WebsocketStream} = require('@binance/connector')

const logger = new Console({ stdout: process.stdout, stderr: process.stderr })

const callbacks = {
  open: () => logger.debug('Connected with Websocket server'),
  close: () => logger.debug('Disconnected with Websocket server'),
  message: data => logger.info(data)
}

const websocketStreamClient = new WebsocketStream({ logger, callbacks })

// all pairs
// websocketStreamClient.ticker()

// single pair
websocketStreamClient.ticker('btcusdt')
*/
/*
'use strict'

const { Console } = require('console')
const { WebsocketAPI } = require('@binance/connector')

const logger = new Console({ stdout: process.stdout, stderr: process.stderr })

const callbacks = {
  open: (client) => {
    logger.debug('Connected with Websocket server')
    //client.avgPrice('BTCUSDT')
    //client.klines('BTCUSDT', '1m')
    //client.time()
    client.avgPrice('BTCUSDT' )
  },
  close: () => logger.debug('Disconnected with Websocket server'),
  message: data => logger.info(JSON.parse(data).result)
}

const websocketAPIClient = new WebsocketAPI(apiKey, apiSecret, { logger, callbacks })

// get the exchange info by specifying the symbols
//setInterval(() => websocketAPIClient.avgPrice('BTCUSDT'), 3000)
// disconnect after 20 seconds
//setTimeout(() => websocketAPIClient.disconnect(), 20000)
*/




/*
const { Console } = require('console')
const { WebsocketAPI } = require('@binance/connector')
const logger = new Console({ stdout: process.stdout, stderr: process.stderr })

// callbacks for different events
const callbacks = {
  open: (client) => {
    logger.debug('Connected with Websocket server')
    // send message to get orderbook info after connection open
    //client.avgPrice('BTCUSDT')
    client.klines('BTCUSDT', '1m')
    //client.orderbook('BNBUSDT', { limit: 10 })
  },
  close: () => logger.debug('Disconnected with Websocket server'),
  message: data => logger.info(data)
}

const websocketAPIClient = new WebsocketAPI(apiKey, apiSecret, { logger, callbacks })

// disconnect the connection
//setTimeout(() => websocketAPIClient.disconnect(), 20000)
*/

