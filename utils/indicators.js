const { StochasticRSI, MACD, ADX } = require('technicalindicators'); //https://github.com/anandanand84/technicalindicators?tab=readme-ov-file#readme

const getIndicators = async (candleArray) =>{
    const filterCandlesHigh = candleArray.map(candle => Number(candle[2]));   //2 is the index for closing price
    const filterCandlesLow = candleArray.map(candle => Number(candle[3]));    //3 is the index for closing price
    const filterCandlesClosing = candleArray.map(candle => Number(candle[4]));//4 is the index for closing price
   
    //StochasticRSI
    const stoch_rsi = StochasticRSI.calculate({
        values: filterCandlesClosing,
        rsiPeriod: 14,
        stochasticPeriod: 14,
        kPeriod: 3,
        dPeriod: 3,
    });
    const CURRENT_STOCH_RSI = stoch_rsi[stoch_rsi.length -1];
    //MACD
    const macd = MACD.calculate({
        values: filterCandlesClosing,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9 ,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const CURRENT_MACD = macd[macd.length -1];
    //ADX
    const adx =  ADX.calculate({
        close: filterCandlesClosing,
        high: filterCandlesHigh,
        low: filterCandlesLow,
        period : 14
    });
    const CURRENT_ADX = adx[adx.length -1];
    return {
        stoch_rsi,
        CURRENT_STOCH_RSI,
        macd,
        CURRENT_MACD,
        adx,
        CURRENT_ADX
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