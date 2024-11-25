//claude 0.5% movements, more signales, less predictions

const analyzeCandles = (candles, analysisWindow = candles.length) => {
  if (candles.length < 2) {
    return {
      status: "Insufficient data",
      description: "Need at least 2 candles for analysis"
    };
  }
  
  const candlesToAnalyze = candles.slice(-analysisWindow);
  const extractNumber = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const priceChanges = candlesToAnalyze.map((candle, index) => {
    if (index === 0) return 0;
    const prevClose = extractNumber(candlesToAnalyze[index - 1][4]);
    const currentClose = extractNumber(candle[4]);
    return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
  }).slice(1);

  // Add short-term price changes calculation (last 3 candles)
  const recentPriceChanges = priceChanges.slice(-3);
  const shortTermTrend = recentPriceChanges.reduce((sum, change) => sum + change, 0) / recentPriceChanges.length;

  const volumeChanges = candlesToAnalyze.map((candle, index) => {
    if (index === 0) return 0;
    const prevVolume = extractNumber(candlesToAnalyze[index - 1][5]);
    const currentVolume = extractNumber(candle[5]);
    return prevVolume === 0 ? 0 : ((currentVolume - prevVolume) / prevVolume) * 100;
  }).slice(1);

  const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
  const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;

  const lastCandle = candlesToAnalyze[candlesToAnalyze.length - 1];
  const firstCandle = candlesToAnalyze[0];

  const overallPriceChange = ((extractNumber(lastCandle[4]) - extractNumber(firstCandle[1])) / extractNumber(firstCandle[1])) * 100;
  const overallVolumeChange = ((extractNumber(lastCandle[5]) - extractNumber(firstCandle[5])) / extractNumber(firstCandle[5])) * 100;

  const highestPrice = Math.max(...candlesToAnalyze.map(candle => extractNumber(candle[2])));
  const lowestPrice = Math.min(...candlesToAnalyze.map(candle => extractNumber(candle[3])));

  // More sensitive trend detection
  let priceTrend;
  if (avgPriceChange > 0.25) priceTrend = "BULLISH";
  else if (avgPriceChange < -0.25) priceTrend = "BEARISH";
  else priceTrend = "SIDEWAYS";

  // Add short-term trend classification
  let shortTermPriceTrend;
  if (shortTermTrend > 0.15) shortTermPriceTrend = "BULLISH";
  else if (shortTermTrend < -0.15) shortTermPriceTrend = "BEARISH";
  else shortTermPriceTrend = "SIDEWAYS";

  let volumeTrend;
  if (avgVolumeChange > 3) volumeTrend = "INCREASING";
  else if (avgVolumeChange < -3) volumeTrend = "DECREASING";
  else volumeTrend = "STABLE";

  return {
    priceTrend,
    shortTermPriceTrend,
    volumeTrend,
    avgPriceChange: avgPriceChange.toFixed(2) + "%",
    shortTermTrend: shortTermTrend.toFixed(2) + "%",
    avgVolumeChange: avgVolumeChange.toFixed(2) + "%",
    overallPriceChange: overallPriceChange.toFixed(2) + "%",
    overallVolumeChange: overallVolumeChange.toFixed(2) + "%",
    highestPrice: highestPrice.toFixed(2),
    lowestPrice: lowestPrice.toFixed(2),
    summary: `The market is showing a ${priceTrend.toLowerCase()} price trend with ${volumeTrend.toLowerCase()} volume. ` +
      `Short-term trend is ${shortTermPriceTrend.toLowerCase()} (${shortTermTrend.toFixed(2)}%). ` +
      `Average price change: ${avgPriceChange.toFixed(2)}%, Average volume change: ${avgVolumeChange.toFixed(2)}%. ` +
      `Overall price movement: ${overallPriceChange.toFixed(2)}%, Overall volume change: ${overallVolumeChange.toFixed(2)}%.`
  };
};

const shouldBuyOrSell = (indicators, candles, analysisWindow = candles.length) => {
  if (candles.length < 2) {
    return "Insufficient candle data for analysis";
  }
  
  const candleAnalysis = analyzeCandles(candles, analysisWindow);
  const lastCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  const lastClose = parseFloat(lastCandle[4]);
  const previousClose = parseFloat(previousCandle[4]);
  const lastOpen = parseFloat(lastCandle[1]);
  const lastVolume = parseFloat(lastCandle[5]);

  const priceChange = ((lastClose - previousClose) / previousClose) * 100;
  const volumeChange = ((lastVolume - parseFloat(previousCandle[5])) / parseFloat(previousCandle[5])) * 100;

  // More sensitive thresholds
  const RSI_BUY_LIMIT = 45; // Increased from 40
  const RSI_SELL_LIMIT = 55; // Decreased from 60
  const STOCH_BUY_LIMIT = 45; // Increased from 40
  const STOCH_SELL_LIMIT = 55; // Decreased from 60
  const MACD_BUY_LIMIT = -0.05; // Slightly negative to catch early movements
  const MACD_SELL_LIMIT = 0.05; // Slightly positive to catch early movements
  const ATR_THRESHOLD = 0.3; // Reduced from 0.5 to catch smaller movements
  const CONDITIONS_NEEDED = 3; // Reduced from 4 to make signals more frequent

  // Enhanced MACD analysis
  const macdCrossUp = (indicators.macd && indicators.macd.length > 1) 
      ? (indicators.macd[indicators.macd.length - 1].histogram > MACD_BUY_LIMIT && 
         indicators.macd[indicators.macd.length - 2].histogram <= MACD_BUY_LIMIT) ||
        (indicators.macd[indicators.macd.length - 1].histogram > indicators.macd[indicators.macd.length - 2].histogram)
      : false;

  const macdCrossDown = (indicators.macd && indicators.macd.length > 1) 
      ? (indicators.macd[indicators.macd.length - 1].histogram < MACD_SELL_LIMIT && 
         indicators.macd[indicators.macd.length - 2].histogram >= MACD_SELL_LIMIT) ||
        (indicators.macd[indicators.macd.length - 1].histogram < indicators.macd[indicators.macd.length - 2].histogram)
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

  const aoPositive = (indicators.ao && indicators.ao.length > 1) 
      ? indicators.ao[indicators.ao.length - 1] > 0 &&
        indicators.ao[indicators.ao.length - 1] > indicators.ao[indicators.ao.length - 2]
      : false;

  const aoNegative = (indicators.ao && indicators.ao.length > 1) 
      ? indicators.ao[indicators.ao.length - 1] < 0 &&
        indicators.ao[indicators.ao.length - 1] < indicators.ao[indicators.ao.length - 2]
      : false;

  const atrIncreasing = (indicators.atr && indicators.atr.length > 1) 
      ? indicators.atr[indicators.atr.length - 1] > indicators.atr[indicators.atr.length - 2] 
      : false;

  const highVolatility = (indicators.atr && indicators.atr.length > 0)
      ? indicators.atr[indicators.atr.length - 1] > ATR_THRESHOLD
      : false;

  let buyScore = 0;
  let sellScore = 0;

  const isBullishCandle = lastClose > lastOpen;
  const isVolumeIncreasing = volumeChange > 3; // Reduced from 5%
  const isVolumeDecreasing = volumeChange < -3; // Reduced from -5%

  // Enhanced scoring system
  if (macdCrossUp) buyScore += 2;
  if (stochRSIOverselled) buyScore += 1;
  if (rsiOK) buyScore += 1;
  if (aoPositive) buyScore += 1.5; // Increased weight
  if (atrIncreasing) buyScore += 1;
  if (isBullishCandle) buyScore += 1;
  if (isVolumeIncreasing) buyScore += 1;
  if (candleAnalysis.shortTermPriceTrend === "BULLISH") buyScore += 1.5;

  // More sensitive price change scoring
  if (priceChange > 0.5 && priceChange < 2) { // Reduced thresholds
    buyScore += 1.5;
  } else if (priceChange < -0.5) {
    sellScore += 1.5;
  }

  if (macdCrossDown) sellScore += 2;
  if (stochRSIOverbought) sellScore += 1;
  if (rsiOverbought) sellScore += 1;
  if (aoNegative) sellScore += 1.5;
  if (isVolumeDecreasing) sellScore += 1;
  if (candleAnalysis.shortTermPriceTrend === "BEARISH") sellScore += 1.5;

  const resData = {
    signal: '',
    trend: candleAnalysis,
    scores: { // Added for debugging
      buyScore,
      sellScore
    }
  };

  if (buyScore >= CONDITIONS_NEEDED && highVolatility && 
      ['BULLISH', 'SIDEWAYS'].includes(candleAnalysis.shortTermPriceTrend)) {
    resData.signal = "BUY";
  } else if (sellScore >= CONDITIONS_NEEDED && highVolatility) {
    resData.signal = "SELL";
  } else {
    resData.signal = "HOLD";
  }
  
  return resData;
};
module.exports = { analyzeCandles, shouldBuyOrSell };
