require('dotenv').config(); // env config


const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY_TEST || '',
  APISECRET: process.env.BINANCE_API_SECRET_TEST || '',
  test: true // This flag enables Testnet mode
});
//console.log(process.env.BINANCE_API_KEY_TEST);
// Define your target asset and balance thresholds
const TARGET_ASSET = 'BTC';
const TARGET_PRICE = 70000;
const USDT_ASSET = 'USDT';
const USDT_THRESHOLD = 70000;
// Function to check Bitcoin price and execute trades
const checkAndTrade = async () => {
    
    try {
        console.log( binance.balance(USDT_ASSET));
        const ticker = await binance.prices(TARGET_ASSET + USDT_ASSET);
        const btcPrice = parseFloat(ticker[TARGET_ASSET + USDT_ASSET]);

    if (btcPrice >= TARGET_PRICE) {
      // Check BTC balance
      const btcBalance = await binance.balance(TARGET_ASSET);
      const btcQuantity = parseFloat(btcBalance[TARGET_ASSET].available);

      if (btcQuantity > 0) {
        console.log(`BTC price is above ${TARGET_PRICE}. Holding BTC.`);
      } else {
        // Buy BTC with USDT
        const usdtBalance = await binance.balance(USDT_ASSET);
        const usdtQuantity = parseFloat(usdtBalance[USDT_ASSET].available);

        if (usdtQuantity > 0) {
          const quantityToBuy = usdtQuantity / btcPrice;
          await binance.marketBuy(TARGET_ASSET + USDT_ASSET, quantityToBuy);
          console.log(`Bought ${quantityToBuy} BTC at ${btcPrice} USDT`);
        } else {
          console.log('Insufficient USDT balance.');
        }
      }
    } else {
      // Sell BTC to USDT
      const btcBalance = await binance.balance(TARGET_ASSET);
      const btcQuantity = parseFloat(btcBalance[TARGET_ASSET].available);

      if (btcQuantity > 0) {
        await binance.marketSell(TARGET_ASSET + USDT_ASSET, btcQuantity);
        console.log(`Sold ${btcQuantity} BTC at ${btcPrice} USDT`);
      } else {
        console.log('No BTC to sell.');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the bot every X milliseconds (e.g., every minute)
//setInterval(checkAndTrade, 60000);
checkAndTrade();
