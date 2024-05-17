const ccxt = require('ccxt');
const { MACD, StochasticRSI, AO, ADX } = require('technicalindicators');


async function fetchOHLCV(exchange, symbol, timeframe) {
    if (!exchange.has['fetchOHLCV']) {
        console.log(`The ${exchange.id} exchange does not support fetching OHLCV data.`);
        return null;
    }

    try {
        return await exchange.fetchOHLCV(symbol, timeframe);
    } catch (error) {
        console.error(`Failed to fetch OHLCV data: ${error.message}`);
        return null;  // Ensure null is returned in case of an error
    }
}

function shouldBuy(macd, stochRSI, ao, adx) {
    const macdCrossUp = macd.histogram[macd.histogram.length - 1] > 0 && macd.histogram[macd.histogram.length - 2] <= 0;
    const stochRSIOK = stochRSI.k[stochRSI.k.length - 1] < 0.8;
    const aoPositive = ao[ao.length - 1] > 0;
    const adxStrong = adx.adx[adx.adx.length - 1] > 20;

    return macdCrossUp && stochRSIOK && aoPositive && adxStrong;
}

function shouldSell(macd, stochRSI, ao, adx) {
    const macdCrossDown = macd.histogram[macd.histogram.length - 1] < 0 && macd.histogram[macd.histogram.length - 2] >= 0;
    const stochRSIOverbought = stochRSI.k[stochRSI.k.length - 1] > 0.8;
    const aoNegative = ao[ao.length - 1] < 0;
    const adxStrong = adx.adx[adx.adx.length - 1] > 20;

    return macdCrossDown && stochRSIOverbought && aoNegative && adxStrong;
}


async function main() {
    const exchange = new ccxt.binance({ 'enableRateLimit': true });
    const symbol = 'BTC/USDT';
    const timeframe = '1h';

    const ohlcv = await fetchOHLCV(exchange, symbol, timeframe);
    if (!ohlcv) {
        console.log('Failed to fetch data or data is not available.');
        return;
    }

    const inputMACD = {
        values: ohlcv.map(x => x[4]), // Closing prices
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    };

    const inputStochRSI = {
        values: ohlcv.map(x => x[4]),
        rsiPeriod: 14,
        stochasticPeriod: 14,
        kPeriod: 3,
        dPeriod: 3
    };

    const inputAO = ohlcv.map(x => ({ high: x[2], low: x[3], close: x[4] })); // High, Low, Close
    const inputADX = {
        high: ohlcv.map(x => x[2]),
        low: ohlcv.map(x => x[3]),
        close: ohlcv.map(x => x[4]),
        period: 14
    };

    const macd = MACD.calculate(inputMACD);
    const stochRSI = StochasticRSI.calculate(inputStochRSI);
    const ao = AO.calculate(inputAO);
    const adx = ADX.calculate(inputADX);

    if (shouldBuy(macd, stochRSI, ao, adx)) {
        console.log('Buy Signal Triggered!');
    } else if (shouldSell(macd, stochRSI, ao, adx)) {
        console.log('Sell Signal Triggered!');
    } else {
        console.log('No trade signal.');
    }
}

main()