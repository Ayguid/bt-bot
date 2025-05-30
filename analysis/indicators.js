const { RSI, StochasticRSI, MACD, EMA, ADX, AwesomeOscillator, ATR } = require('technicalindicators'); //https://github.com/anandanand84/technicalindicators?tab=readme-ov-file#readme
//const { getLastElement } = require('../utils/helpers.js');

const getIndicators = async (candleArray) => {
  if (!Array.isArray(candleArray)) {
    console.warn('Invalid candle array:', candleArray);
    return null;
  }

  try {
    const highs = candleArray.map(c => Number(c[2]));
    const lows = candleArray.map(c => Number(c[3]));
    const closes = candleArray.map(c => Number(c[4]));
    const volumes = candleArray.map(c => Number(c[5]));

    const commonParams = { high: highs, low: lows, close: closes };

    // Calculate all indicators in parallel (synchronous)
    const rsi = RSI.calculate({ values: closes, period: 14 });
    const stoch_rsi = StochasticRSI.calculate({
      values: closes,
      rsiPeriod: 14,
      stochasticPeriod: 14,
      kPeriod: 3,
      dPeriod: 3
    });
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const adx = ADX.calculate({ ...commonParams, period: 14 });
    const ao = AwesomeOscillator.calculate({
      ...commonParams,
      volume: volumes,
      fastPeriod: 5,
      slowPeriod: 34,
      format: a => parseFloat(a.toFixed(2))
    });
    const atr = ATR.calculate({ ...commonParams, period: 14 });
    const ema = EMA.calculate({ values: closes, period: 8 });

    // Extract last values
    const getLast = arr => arr[arr.length - 1] || null;

    return {
      // Full series
      rsi, stoch_rsi, macd, adx, ao, atr, ema,

      // Current values
      current_rsi: getLast(rsi),
      current_stoch_rsi: getLast(stoch_rsi),
      current_macd: getLast(macd),
      current_adx: getLast(adx),
      current_ao: getLast(ao),
      current_atr: getLast(atr),
      current_ema: getLast(ema)
    };
  } catch (error) {
    console.error('Indicator calculation failed:', error);
    return null;
  }
};

module.exports = { getIndicators };
/*
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
    const current_rsi = getLastElement(rsi);
    //StochasticRSI ok
    const stoch_rsi = StochasticRSI.calculate({
        values: filterCandlesClosing,
        rsiPeriod: 14,
        stochasticPeriod: 14,
        kPeriod: 3,
        dPeriod: 3,
    });
    const current_stoch_rsi = getLastElement(stoch_rsi); //stoch_rsi[stoch_rsi.length -1]
    //MACD ok
    const macd = MACD.calculate({
        values: filterCandlesClosing,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9 ,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const current_macd = getLastElement(macd);//macd[macd.length -1];
 
    //ADX ??
    const adx =  ADX.calculate({
        close: filterCandlesClosing,
        high: filterCandlesHigh,
        low: filterCandlesLow,
        period: 14
    });
    const current_adx = getLastElement(adx);//adx[adx.length -1];
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
    const current_ao = getLastElement(ao);//ao[ao.length -1];
    //ATR
    const atr = ATR.calculate(
      {
        high : filterCandlesHigh,
        low  : filterCandlesLow,
        close : filterCandlesClosing,
        period : 14
      }
    );
    const current_atr = getLastElement(atr);//atr[atr.length -1];
    //
    //EMA
    const ema = EMA.calculate({
      period : 8,
      values : filterCandlesClosing
    });
    const current_ema = ema[ema.length -1]; 

    return {
        rsi,
        current_rsi,
        stoch_rsi,
        current_stoch_rsi,
        macd,
        current_macd,
        adx,
        current_adx,
        ao,
        current_ao,
        atr,
        current_atr,
        ema,
        current_ema,
    };
}

module.exports = { getIndicators };
*/
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
