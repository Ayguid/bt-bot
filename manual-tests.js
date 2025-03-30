require('dotenv').config(); // Environment variables
const { fetchMyAccount, avgPrice, tickerPrice, fetchMyOrders, fetchMyTrades, placeOrder, getOrder, cancelOrder, assetDetail, klines, exchangeInfo} = require('./utils/binance-spot.js');
const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Type in terminal');

rl.on('line', (input) => {
    console.log(`Received: ${input}`);
    if(input.startsWith('cmd')){
        let substr = input.substr(input.indexOf(" ")+1); //removes cmd from string
        executeCommand(substr);
    }
});

const executeCommand = async (text) =>{
    //console.log(command);
    //const commandArray = command.split(" ");
    const [command, ...args] = text.split(' ');
    console.log(command);
    const commands = {
        getBalance: () => args[0] ? getBalance(args[0]) : getBalance(),
        assetDetail: () => asset(commandArray[0])
    };
    const action = commands[command];
    return action ? await action() : console.log('Unknown command.');
}

const getBalance = async (token = false) =>{
    const res = await  fetchMyAccount();
    if(token) console.log(res.balances.find(asset => asset.asset == token));
    else console.log(res);
}

const asset = async (token) =>{
    const res =  await assetDetail(token); 
    console.log(res);
}

//cancelOrder('BTCUSDT', 8571283);

//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 62260.76, quantity: 0.0015, timeInForce: 'GTC'});

/*
placeOrder('ADAUSDC', 'BUY', 'LIMIT', {price: 0.5193, quantity: 100, timeInForce: 'GTC'});
//getOrder(keyPair, 10320852);
//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 66000, quantity: 0.1, timeInForce: 'GTC'});
//cancelOrder('BTCUSDT', 4228567);
*/
//placeOrder('BTCUSDT', 'BUY', 'LIMIT', {price: 66129, quantity: 0.1, timeInForce: 'GTC'});


//cancelOrder('BTCUSDT', 7066174);
//placeOrder('BTCUSDT', 'SELL', 'LIMIT', {price: 63056, quantity: 0.1, timeInForce: 'GTC'});

//placeOrder('BTCUSDT', 'BUY', 'STOP_LOSS', {price: 66129, quantity: 0.1, timeInForce: 'GTC', stopPrice: 65129});

// const results = async () => {const res =  await  assetDetail('BNB'); console.log(res)}
// const results = async () => {const res =  await  fetchMyAccount(); console.log(res.balances.find(asset => asset.asset == 'USDT'))}
// const results = async () => {const res =  await  fetchMyAccount(); console.log(res)}
// const results = async () => {const res =  await  exchangeInfo({symbol: 'ETHUSDT'}); console.log(res.symbols[0].filters)}

/*
(async ()=>{
    const res = await  fetchMyAccount(); 
    console.log(res.balances.find(asset => asset.asset == 'USDT'));
    //console.log(res);
})()
*/