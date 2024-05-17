const { StochasticRSI, MACD, ADX, AwesomeOscillator } = require('technicalindicators'); //https://github.com/anandanand84/technicalindicators?tab=readme-ov-file#readme

const getIndicators = async (candleArray) =>{
    const filterCandlesHigh = candleArray.map(candle => Number(candle[2]));   //2 is the index for high price
    const filterCandlesLow = candleArray.map(candle => Number(candle[3]));    //3 is the index for low price
    const filterCandlesClosing = candleArray.map(candle => Number(candle[4]));//4 is the index for closing price
    const filterCandlesVolume = candleArray.map(candle => Number(candle[5])); //5 is the index for volume
    //StochasticRSI ok
    const stoch_rsi = StochasticRSI.calculate({
        values: filterCandlesClosing,
        rsiPeriod: 14,
        stochasticPeriod: 14,
        kPeriod: 3,
        dPeriod: 3,
    });
    const CURRENT_STOCH_RSI = stoch_rsi[stoch_rsi.length -1];
    //MACD ok
    const macd = MACD.calculate({
        values: filterCandlesClosing,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9 ,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const CURRENT_MACD = macd[macd.length -1];
    //ADX ??
    const adx =  ADX.calculate({
        close: filterCandlesClosing,
        high: filterCandlesHigh,
        low: filterCandlesLow,
        period: 14
    });
    const CURRENT_ADX = adx[adx.length -1];
    //Awesome oscilator (AO) ??
    const ao = AwesomeOscillator.calculate({
        high: filterCandlesHigh,
        low: filterCandlesLow,
        close: filterCandlesClosing,
        volume : filterCandlesVolume,
        fastPeriod : 5,
        slowPeriod : 34,
        format : (a)=>parseFloat(a.toFixed(2))
    });
    const CURRENT_AO = ao[ao.length -1];
    
    //
    return {
        stoch_rsi,
        CURRENT_STOCH_RSI,
        macd,
        CURRENT_MACD,
        adx,
        CURRENT_ADX,
        ao,
        CURRENT_AO,
        filterCandlesClosing
    };
}

  
module.exports = { getIndicators };
/* candle example in BINANCE
[
  [
    1499040000000,      //0- Open time
    "0.00386200",       //1- Open
    "0.00386200",       //2- High
    "0.00386200",       //3- Low
    "0.00386200",       //4- Close
    "0.47000000",       //5- Volume
    1499644799999,      //6- Close time
    "0.00181514",       //7- Quote asset volume
    1,                  //8- Number of trades
    "0.47000000",       //9- Taker buy base asset volume
    "0.00181514",       //10-Taker buy quote asset volume
    "0"                 //11-Ignore.
  ]
]
*/

/*

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



*/