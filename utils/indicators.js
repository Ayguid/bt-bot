const { RSI, StochasticRSI, MACD, EMA, ADX, AwesomeOscillator, ATR } = require('technicalindicators'); //https://github.com/anandanand84/technicalindicators?tab=readme-ov-file#readme
const { getLastElement } = require('./helpers.js');
const { analyzeCandles } = require('./trendCalcs.js');

const getIndicators = async (candleArray) =>{
    if(!Array.isArray(candleArray)) {console.log(candleArray); return;}
    const filterCandlesHigh = candleArray.map(candle => Number(candle[2]));   //2 is the index for high price
    const filterCandlesLow = candleArray.map(candle => Number(candle[3]));    //3 is the index for low price
    const filterCandlesClosing = candleArray.map(candle => Number(candle[4]));//4 is the index for closing price
    const filterCandlesVolume = candleArray.map(candle => Number(candle[5])); //5 is the index for volume
    //RSI
    const rsi = RSI.calculate({
      values: filterCandlesClosing,
      period : 14
    });
    const CURRENT_RSI = rsi[rsi.length -1];
    //StochasticRSI ok
    const stoch_rsi = StochasticRSI.calculate({
        values: filterCandlesClosing,
        rsiPeriod: 14,
        stochasticPeriod: 14,
        kPeriod: 3,
        dPeriod: 3,
    });
    const CURRENT_STOCH_RSI = getLastElement(stoch_rsi); //stoch_rsi[stoch_rsi.length -1]
    //MACD ok
    const macd = MACD.calculate({
        values: filterCandlesClosing,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9 ,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const CURRENT_MACD = getLastElement(macd);//macd[macd.length -1];
    //EMA
    const ema = EMA.calculate({
      period : 8,
      values : filterCandlesClosing
    });
    const CURRENT_EMA = ema[ema.length -1];  
    //ADX ??
    const adx =  ADX.calculate({
        close: filterCandlesClosing,
        high: filterCandlesHigh,
        low: filterCandlesLow,
        period: 14
    });
    const CURRENT_ADX = getLastElement(adx);//adx[adx.length -1];
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
    const CURRENT_AO = getLastElement(ao);//ao[ao.length -1];
    //ATR
    const atr = ATR.calculate(
      {
        high : filterCandlesHigh,
        low  : filterCandlesLow,
        close : filterCandlesClosing,
        period : 14
      }
    );
    const CURRENT_ATR = getLastElement(atr);//atr[atr.length -1];
    //
    return {
        rsi,
        CURRENT_RSI,
        stoch_rsi,
        CURRENT_STOCH_RSI,
        macd,
        ema,
        CURRENT_EMA,
        CURRENT_MACD,
        adx,
        CURRENT_ADX,
        ao,
        CURRENT_AO,
        atr,
        CURRENT_ATR,
        trend: analyzeCandles(candleArray, 12)// To calculate the 24-hour trend with 2-hour candles, pass 12 as the analysis window
    };
}

// 
const buyApproval = (indicators) => {
  const STOCH_BUY_LIMIT = 40;  // Adjusted to be less strict
  const MACD_BUY_LIMIT = 0.1;   // Slightly positive to detect bullish momentum

  const macdCrossUp = (indicators.macd && indicators.macd.length > 1)
      ? indicators.macd[indicators.macd.length - 1].histogram > MACD_BUY_LIMIT && indicators.macd[indicators.macd.length - 2].histogram <= MACD_BUY_LIMIT
      : false;

  const stochRSIOK = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0)
      ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k < STOCH_BUY_LIMIT
      : false;

  const macdAboveSignal = (indicators.macd && indicators.macd.length > 1)
      ? indicators.macd[indicators.macd.length - 1].macd > indicators.macd[indicators.macd.length - 1].signal
      : false;
  /*
    const rsiOK = (indicators.rsi && indicators.rsi.length > 0)
      ? indicators.rsi[indicators.rsi.length - 1] < 30
      : false;

    const aoPositive = (indicators.ao && indicators.ao.length > 0)
      ? indicators.ao[indicators.ao.length - 1] > 0
      : false;

    const adxStrong = (indicators.adx && indicators.adx.length > 0)
        ? indicators.adx[indicators.adx.length - 1].adx > 20
        : false;

    const atrIncreasing = (indicators.atr && indicators.atr.length > 1)
    ? indicators.atr[indicators.atr.length - 1] > indicators.atr[indicators.atr.length - 2]
    : false;
    
    const emaCrossUp = (indicators.ema && indicators.ema.length > 1)
    ? indicators.ema[indicators.ema.length - 1].shortEMA > indicators.ema[indicators.ema.length - 1].longEMA
    : false;
  */    

  return macdCrossUp && stochRSIOK && macdAboveSignal;
};


const sellApproval = (indicators) => {
  const STOCH_SELL_LIMIT = 70; // Stochastic RSI k > 70 for sell signal
  const MACD_SELL_LIMIT = 0;   // MACD histogram < 0 for sell signal
  const ADX_STRONG_THRESHOLD = 20; // Threshold for strong ADX

  // Check for MACD histogram cross down
  const macdCrossDown = (indicators.macd && indicators.macd.length > 1)
      ? indicators.macd[indicators.macd.length - 1].histogram < MACD_SELL_LIMIT && indicators.macd[indicators.macd.length - 2].histogram >= MACD_SELL_LIMIT
      : false;

  // Check if the last stochastic RSI k value is above the sell limit
  const stochRSIOverbought = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0)
      ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_SELL_LIMIT
      : false;

  // Check if the Awesome Oscillator is negative
  const aoNegative = (indicators.ao && indicators.ao.length > 0)
      ? indicators.ao[indicators.ao.length - 1] < 0
      : false;

  // Check if the ADX is strong (above the defined threshold)
  const adxStrong = (indicators.adx && indicators.adx.length > 0)
      ? indicators.adx[indicators.adx.length - 1].adx > ADX_STRONG_THRESHOLD
      : false;

  // Return sell approval if all conditions are met
  return macdCrossDown && stochRSIOverbought && aoNegative && adxStrong;
};


  
module.exports = { getIndicators, buyApproval, sellApproval };
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
