const analyzeCandles = (candles, analysisWindow = candles.length) => {
  if (candles.length < 2) {
    return {
      status: "Insufficient data",
      description: "Need at least 2 candles for analysis"
    };
  }
  // Analyze only the last 'analysisWindow' candles (e.g., 12 for 24 hours)
  const candlesToAnalyze = candles.slice(-analysisWindow);
  const extractNumber = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const priceChanges = candlesToAnalyze.map((candle, index) => {
    if (index === 0) return 0;// ignore as we need previous candle to compare, and 0 index has none
    const prevClose = extractNumber(candlesToAnalyze[index - 1][4]);  // Previous Close (index 4)
    const currentClose = extractNumber(candle[4]);                     // Current Close (index 4)
    return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
  }).slice(1);

  const volumeChanges = candlesToAnalyze.map((candle, index) => {
    if (index === 0) return 0;// ignore as we need previous candle to compare, and 0 index has none
    const prevVolume = extractNumber(candlesToAnalyze[index - 1][5]);  // Previous Volume (index 5)
    const currentVolume = extractNumber(candle[5]);                    // Current Volume (index 5)
    return prevVolume === 0 ? 0 : ((currentVolume - prevVolume) / prevVolume) * 100;
  }).slice(1);

  const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
  const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;

  const lastCandle = candlesToAnalyze[candlesToAnalyze.length - 1];
  const firstCandle = candlesToAnalyze[0];

  const overallPriceChange = ((extractNumber(lastCandle[4]) - extractNumber(firstCandle[1])) / extractNumber(firstCandle[1])) * 100;  // First Open (index 1) to Last Close (index 4)
  const overallVolumeChange = ((extractNumber(lastCandle[5]) - extractNumber(firstCandle[5])) / extractNumber(firstCandle[5])) * 100;  // First Volume (index 5) to Last Volume (index 5)

  const highestPrice = Math.max(...candlesToAnalyze.map(candle => extractNumber(candle[2])));  // High (index 2)
  const lowestPrice = Math.min(...candlesToAnalyze.map(candle => extractNumber(candle[3])));   // Low (index 3)

  let priceTrend, volumeTrend;

  if (avgPriceChange > 0.5) priceTrend = "Bullish";
  else if (avgPriceChange < -0.5) priceTrend = "Bearish";
  else priceTrend = "Sideways";

  if (avgVolumeChange > 5) volumeTrend = "Increasing";
  else if (avgVolumeChange < -5) volumeTrend = "Decreasing";
  else volumeTrend = "Stable";

  return {
    priceTrend,
    volumeTrend,
    avgPriceChange: avgPriceChange.toFixed(2) + "%",
    avgVolumeChange: avgVolumeChange.toFixed(2) + "%",
    overallPriceChange: overallPriceChange.toFixed(2) + "%",
    overallVolumeChange: overallVolumeChange.toFixed(2) + "%",
    highestPrice: highestPrice.toFixed(2),
    lowestPrice: lowestPrice.toFixed(2),
    summary: `The market is showing a ${priceTrend.toLowerCase()} price trend with ${volumeTrend.toLowerCase()} volume. ` +
      `Average price change: ${avgPriceChange.toFixed(2)}%, Average volume change: ${avgVolumeChange.toFixed(2)}%. ` +
      `Overall price movement: ${overallPriceChange.toFixed(2)}%, Overall volume change: ${overallVolumeChange.toFixed(2)}%.`,
    lastCandle  
  };
};

const shouldBuyOrSell = (indicators, candles) => {
  // Check if there are enough candles for analysis
  if (candles.length < 2) {
      return "Insufficient candle data for analysis";
  }

  // Analyze the last candle
  const lastCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  const lastClose = parseFloat(lastCandle[4]); // Last Close Price
  const previousClose = parseFloat(previousCandle[4]); // Previous Close Price
  const lastOpen = parseFloat(lastCandle[1]); // Last Open Price
  const lastVolume = parseFloat(lastCandle[5]); // Last Volume

  // Analyze price change and volume change
  const priceChange = ((lastClose - previousClose) / previousClose) * 100;
  const volumeChange = ((lastVolume - parseFloat(previousCandle[5])) / parseFloat(previousCandle[5])) * 100;

  // Thresholds
  const RSI_BUY_LIMIT = 40;
  const RSI_SELL_LIMIT = 60;
  const STOCH_BUY_LIMIT = 40;
  const STOCH_SELL_LIMIT = 60;
  const MACD_BUY_LIMIT = 0;
  const MACD_SELL_LIMIT = 0;
  const ATR_THRESHOLD = 0.5;
  const CONDITIONS_NEEDED = 4;

  // Relaxed indicator conditions
  const macdCrossUp = (indicators.macd && indicators.macd.length > 1) 
      ? indicators.macd[indicators.macd.length - 1].histogram > MACD_BUY_LIMIT && 
        indicators.macd[indicators.macd.length - 2].histogram <= MACD_BUY_LIMIT 
      : false;

  const macdCrossDown = (indicators.macd && indicators.macd.length > 1) 
      ? indicators.macd[indicators.macd.length - 1].histogram < MACD_SELL_LIMIT && 
        indicators.macd[indicators.macd.length - 2].histogram >= MACD_SELL_LIMIT 
      : false;

  const stochRSIOverselled = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) 
      ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k < STOCH_BUY_LIMIT 
      : false;

  const stochRSIOverbought = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) 
      ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_SELL_LIMIT 
      : false;

  const rsiOK = (indicators.rsi && indicators.rsi.length > 0) 
      ? indicators.rsi[indicators.rsi.length - 1] < RSI_BUY_LIMIT 
      : false;

  const rsiOverbought = (indicators.rsi && indicators.rsi.length > 0) 
      ? indicators.rsi[indicators.rsi.length - 1] > RSI_SELL_LIMIT 
      : false;

  const aoPositive = (indicators.ao && indicators.ao.length > 0) 
      ? indicators.ao[indicators.ao.length - 1] > 0 
      : false;

  const aoNegative = (indicators.ao && indicators.ao.length > 0) 
      ? indicators.ao[indicators.ao.length - 1] < 0 
      : false;

  const atrIncreasing = (indicators.atr && indicators.atr.length > 1) 
      ? indicators.atr[indicators.atr.length - 1] > indicators.atr[indicators.atr.length - 2] 
      : false; 

  const highVolatility = (indicators.atr && indicators.atr.length > 0)
      ? indicators.atr[indicators.atr.length - 1] > ATR_THRESHOLD
      : false;

  // Scoring system for buy or sell signals
  let buyScore = 0;
  let sellScore = 0;

  // Price trend enhancement: Check if the last close is higher than the last open (bullish candle)
  const isBullishCandle = lastClose > lastOpen;

  // Volume trend analysis
  const isVolumeIncreasing = volumeChange > 5; // 5% increase as an example
  const isVolumeDecreasing = volumeChange < -5; // 5% decrease as an example

  // Assign weights to each indicator
  if (macdCrossUp) buyScore += 2;  // Stronger signal
  if (stochRSIOverselled) buyScore += 1;   // Weaker signal
  if (rsiOK) buyScore += 1;
  if (aoPositive) buyScore += 1;
  if (atrIncreasing) buyScore += 1;

  // Incorporate candle insights into buy score
  if (isBullishCandle) buyScore += 1;
  if (isVolumeIncreasing) buyScore += 1;

  // Incorporate price change into buy/sell scores
  if (priceChange > 1) { // If the price has increased by more than 1%
      buyScore += 1; // Favorable for buying
  } else if (priceChange < -1) { // If the price has decreased by more than 1%
      sellScore += 1; // Favorable for selling
  }

  // Sell conditions
  if (macdCrossDown) sellScore++;
  if (stochRSIOverbought) sellScore++;
  if (rsiOverbought) sellScore++;
  if (aoNegative) sellScore++;
  if (isVolumeDecreasing) sellScore++; // Penalize sell score if volume decreases

  // Flexibility: Only 'CONDITIONS_NEEDED' or more conditions need to be met for a buy or sell signal
  if (buyScore >= CONDITIONS_NEEDED && highVolatility) {
      return "Buy";
  } else if (sellScore >= CONDITIONS_NEEDED && highVolatility) {
      return "Sell";
  } else {
      return "Hold";
  }
};


module.exports = { analyzeCandles, shouldBuyOrSell };


/*

const analyzeCandles = (candles, analysisWindow = candles.length) => {
    if (candles.length < 2) {
      return {
        status: "Insufficient data",
        description: "Need at least 2 candles for analysis"
      };
    }
    // Analyze only the last 'analysisWindow' candles (e.g., 12 for 24 hours)
    const candlesToAnalyze = candles.slice(-analysisWindow);
    const extractNumber = (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };
  
    const priceChanges = candlesToAnalyze.map((candle, index) => {
      if (index === 0) return 0;// ignore as we need previous candle to compare, and 0 index has none
      const prevClose = extractNumber(candlesToAnalyze[index - 1][4]);  // Previous Close (index 4)
      const currentClose = extractNumber(candle[4]);                     // Current Close (index 4)
      return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
    }).slice(1);
  
    const volumeChanges = candlesToAnalyze.map((candle, index) => {
      if (index === 0) return 0;// ignore as we need previous candle to compare, and 0 index has none
      const prevVolume = extractNumber(candlesToAnalyze[index - 1][5]);  // Previous Volume (index 5)
      const currentVolume = extractNumber(candle[5]);                    // Current Volume (index 5)
      return prevVolume === 0 ? 0 : ((currentVolume - prevVolume) / prevVolume) * 100;
    }).slice(1);
  
    const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
  
    const lastCandle = candlesToAnalyze[candlesToAnalyze.length - 1];
    const firstCandle = candlesToAnalyze[0];
  
    const overallPriceChange = ((extractNumber(lastCandle[4]) - extractNumber(firstCandle[1])) / extractNumber(firstCandle[1])) * 100;  // First Open (index 1) to Last Close (index 4)
    const overallVolumeChange = ((extractNumber(lastCandle[5]) - extractNumber(firstCandle[5])) / extractNumber(firstCandle[5])) * 100;  // First Volume (index 5) to Last Volume (index 5)
  
    const highestPrice = Math.max(...candlesToAnalyze.map(candle => extractNumber(candle[2])));  // High (index 2)
    const lowestPrice = Math.min(...candlesToAnalyze.map(candle => extractNumber(candle[3])));   // Low (index 3)
  
    let priceTrend, volumeTrend;
  
    if (avgPriceChange > 0.5) priceTrend = "Bullish";
    else if (avgPriceChange < -0.5) priceTrend = "Bearish";
    else priceTrend = "Sideways";
  
    if (avgVolumeChange > 5) volumeTrend = "Increasing";
    else if (avgVolumeChange < -5) volumeTrend = "Decreasing";
    else volumeTrend = "Stable";
  
    return {
      priceTrend,
      volumeTrend,
      avgPriceChange: avgPriceChange.toFixed(2) + "%",
      avgVolumeChange: avgVolumeChange.toFixed(2) + "%",
      overallPriceChange: overallPriceChange.toFixed(2) + "%",
      overallVolumeChange: overallVolumeChange.toFixed(2) + "%",
      highestPrice: highestPrice.toFixed(2),
      lowestPrice: lowestPrice.toFixed(2),
      summary: `The market is showing a ${priceTrend.toLowerCase()} price trend with ${volumeTrend.toLowerCase()} volume. ` +
        `Average price change: ${avgPriceChange.toFixed(2)}%, Average volume change: ${avgVolumeChange.toFixed(2)}%. ` +
        `Overall price movement: ${overallPriceChange.toFixed(2)}%, Overall volume change: ${overallVolumeChange.toFixed(2)}%.`
    };
  };
  
  const shouldBuyOrSell = (indicators) => {
      // Thresholds
      const RSI_BUY_LIMIT = 40; // Raised to be less strict
      const RSI_SELL_LIMIT = 60; // Relaxed sell threshold
      const STOCH_BUY_LIMIT = 40; // Raised from 30
      const STOCH_SELL_LIMIT = 60; // Raised from 70
      const MACD_BUY_LIMIT = 0;    // Unchanged
      const MACD_SELL_LIMIT = 0;   // Unchanged
      //const ADX_TREND_LIMIT = 20;  // ADX limit indicating trend strength
      const ATR_THRESHOLD = 0.5; // Adjust this based on what is considered high volatility for your market
      const CONDITIONS_NEEDED = 3; //2
      
      // Relaxed indicator conditions
      const macdCrossUp = (indicators.macd && indicators.macd.length > 1) 
          ? indicators.macd[indicators.macd.length - 1].histogram > MACD_BUY_LIMIT && 
            indicators.macd[indicators.macd.length - 2].histogram <= MACD_BUY_LIMIT 
          : false;
  
      const macdCrossDown = (indicators.macd && indicators.macd.length > 1) 
          ? indicators.macd[indicators.macd.length - 1].histogram < MACD_SELL_LIMIT && 
            indicators.macd[indicators.macd.length - 2].histogram >= MACD_SELL_LIMIT 
          : false;
  
      const stochRSIOverselled = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) 
          ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k < STOCH_BUY_LIMIT 
          : false;
  
      const stochRSIOverbought = (indicators.stoch_rsi && indicators.stoch_rsi.length > 0) 
          ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_SELL_LIMIT 
          : false;
  
      const rsiOK = (indicators.rsi && indicators.rsi.length > 0) 
          ? indicators.rsi[indicators.rsi.length - 1] < RSI_BUY_LIMIT 
          : false;
  
      const rsiOverbought = (indicators.rsi && indicators.rsi.length > 0) 
          ? indicators.rsi[indicators.rsi.length - 1] > RSI_SELL_LIMIT 
          : false;
  
      const aoPositive = (indicators.ao && indicators.ao.length > 0) 
          ? indicators.ao[indicators.ao.length - 1] > 0 
          : false;
  
      const aoNegative = (indicators.ao && indicators.ao.length > 0) 
          ? indicators.ao[indicators.ao.length - 1] < 0 
          : false;
  
      // const adxStrong = (indicators.adx && indicators.adx.length > 0) 
      //     ? indicators.adx[indicators.adx.length - 1].adx > ADX_TREND_LIMIT 
      //     : false;
  
      // const emaCrossUp = (indicators.ema && indicators.ema.length > 1) 
      //     ? indicators.ema[indicators.ema.length - 1].shortEMA > indicators.ema[indicators.ema.length - 1].longEMA 
      //     : false;
  
      // const emaCrossDown = (indicators.ema && indicators.ema.length > 1) 
      //     ? indicators.ema[indicators.ema.length - 1].shortEMA < indicators.ema[indicators.ema.length - 1].longEMA 
      //     : false;
  
      const atrIncreasing = (indicators.atr && indicators.atr.length > 1) 
          ? indicators.atr[indicators.atr.length - 1] > indicators.atr[indicators.atr.length - 2] 
          : false; //buy when volatility is high
      // Volatility threshold (ATR): If ATR has increased significantly, we might use it as a confirmation of buy/sell.
      
      const highVolatility = (indicators.atr && indicators.atr.length > 0)
        ? indicators.atr[indicators.atr.length - 1] > ATR_THRESHOLD
        : false;
  
      // Scoring system for buy or sell signals
      let buyScore = 0;
      let sellScore = 0;
  
      // Assign weights to each indicator
      if (macdCrossUp) buyScore += 2;  // Stronger signal
      if (stochRSIOverselled) buyScore += 1;   // Weaker signal
      if (rsiOK) buyScore += 1;
      if (aoPositive) buyScore += 1;
      if (atrIncreasing) buyScore += 1;
      //if (adxStrong && emaCrossUp) buyScore += 2;  // Stronger signal
  
      // Sell conditions
      if (macdCrossDown) sellScore++;
      if (stochRSIOverbought) sellScore++;
      if (rsiOverbought) sellScore++;
      if (aoNegative) sellScore++;
      //if (adxStrong && emaCrossDown) sellScore++;
  
      // Flexibility: Only 2 or more conditions need to be met for a buy or sell signal
      if (buyScore >= CONDITIONS_NEEDED && highVolatility) {
          return "Buy";
      } else if (sellScore >= CONDITIONS_NEEDED && highVolatility) {
          return "Sell";
      } else {
          return "Hold";
      }
  };
*/