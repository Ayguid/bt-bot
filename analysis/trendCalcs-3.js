

//claude 0.5 predictions instead of movement, less signals, more accurate

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
  
    // Analyze pattern of the last 5 candles for prediction
    const recentCandles = candlesToAnalyze.slice(-5);
    const pricePattern = recentCandles.map((candle, index) => {
      if (index === 0) return 0;
      const prevClose = extractNumber(recentCandles[index - 1][4]);
      const currentClose = extractNumber(candle[4]);
      return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
    }).slice(1);
  
    // Look for acceleration in price changes
    const priceAcceleration = pricePattern.map((change, index) => {
      if (index === 0) return 0;
      return change - pricePattern[index - 1];
    }).slice(1);
  
    // Standard calculations
    const priceChanges = candlesToAnalyze.map((candle, index) => {
      if (index === 0) return 0;
      const prevClose = extractNumber(candlesToAnalyze[index - 1][4]);
      const currentClose = extractNumber(candle[4]);
      return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
    }).slice(1);
  
    const volumeChanges = candlesToAnalyze.map((candle, index) => {
      if (index === 0) return 0;
      const prevVolume = extractNumber(candlesToAnalyze[index - 1][5]);
      const currentVolume = extractNumber(candle[5]);
      return prevVolume === 0 ? 0 : ((currentVolume - prevVolume) / prevVolume) * 100;
    }).slice(1);
  
    // Volume pattern analysis
    const recentVolumePattern = volumeChanges.slice(-3);
    const isVolumeIncreasing = recentVolumePattern.every((change, index) => 
      index === 0 || change > recentVolumePattern[index - 1]
    );
  
    const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
  
    // Predict potential trend
    let priceTrend, potentialMove;
    const acceleration = priceAcceleration.reduce((sum, acc) => sum + acc, 0) / priceAcceleration.length;
    
    if (acceleration > 0.1) {
      priceTrend = "BULLISH";
      potentialMove = "ACCELERATION";
    } else if (avgPriceChange > 0.2 && isVolumeIncreasing) {
      priceTrend = "BULLISH";
      potentialMove = "VOLUME_SUPPORTED";
    } else if (avgPriceChange < -0.2) {
      priceTrend = "BEARISH";
      potentialMove = "REVERSAL_POSSIBLE";
    } else {
      priceTrend = "SIDEWAYS";
      potentialMove = "CONSOLIDATION";
    }
  
    let volumeTrend;
    if (avgVolumeChange > 5) volumeTrend = "INCREASING";
    else if (avgVolumeChange < -5) volumeTrend = "DECREASING";
    else volumeTrend = "STABLE";
  
    return {
      priceTrend,
      volumeTrend,
      potentialMove,
      priceAcceleration: acceleration.toFixed(3),
      avgPriceChange: avgPriceChange.toFixed(2) + "%",
      avgVolumeChange: avgVolumeChange.toFixed(2) + "%",
      volumePattern: isVolumeIncreasing ? "INCREASING" : "MIXED",
      summary: `Market showing ${priceTrend.toLowerCase()} trend with ${potentialMove.toLowerCase()}. ` +
        `Price acceleration: ${acceleration.toFixed(3)}, Volume pattern: ${isVolumeIncreasing ? "increasing" : "mixed"}`
    };
  };
  
  const shouldBuyOrSell = (indicators, candles, analysisWindow = candles.length) => {
    if (candles.length < 2) {
      return "Insufficient candle data for analysis";
    }
    
    const candleAnalysis = analyzeCandles(candles, analysisWindow);
    const lastCandle = candles[candles.length - 1];
    const previousCandle = candles[candles.length - 2];
  
    // Predictive indicators analysis
    const lastClose = parseFloat(lastCandle[4]);
    const previousClose = parseFloat(previousCandle[4]);
    const lastHigh = parseFloat(lastCandle[2]);
    const lastLow = parseFloat(lastCandle[3]);
    const lastVolume = parseFloat(lastCandle[5]);
  
    // Check for potential breakout pattern
    const priceRange = lastHigh - lastLow;
    const closePosition = (lastClose - lastLow) / priceRange; // Relative position of close
    
    const volumeIncrease = ((lastVolume - parseFloat(previousCandle[5])) / parseFloat(previousCandle[5])) * 100;
  
    // Look for early signs of movement
    const isPreBreakout = closePosition > 0.7 && volumeIncrease > 5;
    const isBottoming = closePosition < 0.3 && volumeIncrease > 5;
  
    // More predictive thresholds
    const RSI_MOMENTUM_START = 45;    // RSI level where momentum might start
    const RSI_MOMENTUM_TOP = 65;      // RSI level where momentum might end
    const STOCH_MOMENTUM_START = 30;  // StochRSI level for early momentum
    const MACD_SENSITIVITY = 0.05;    // MACD early cross detection
  
    // Early momentum detection
    const macdMomentumBuilding = (indicators.macd && indicators.macd.length > 2) 
        ? indicators.macd[indicators.macd.length - 1].histogram > indicators.macd[indicators.macd.length - 2].histogram &&
          Math.abs(indicators.macd[indicators.macd.length - 1].histogram) < MACD_SENSITIVITY
        : false;
  
    const stochRSITurning = (indicators.stoch_rsi && indicators.stoch_rsi.length > 1) 
        ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_MOMENTUM_START &&
          indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > indicators.stoch_rsi[indicators.stoch_rsi.length - 2].k
        : false;
  
    const rsiMomentumZone = (indicators.rsi && indicators.rsi.length > 0) 
        ? indicators.rsi[indicators.rsi.length - 1] > RSI_MOMENTUM_START && 
          indicators.rsi[indicators.rsi.length - 1] < RSI_MOMENTUM_TOP
        : false;
  
    // Check for consecutive AO increases
    const aoBuilding = (indicators.ao && indicators.ao.length > 3) 
        ? indicators.ao[indicators.ao.length - 1] > indicators.ao[indicators.ao.length - 2] &&
          indicators.ao[indicators.ao.length - 2] > indicators.ao[indicators.ao.length - 3] &&
          Math.abs(indicators.ao[indicators.ao.length - 1]) < 0.1 // Small absolute value indicates early stage
        : false;
  
    let buyScore = 0;
    let sellScore = 0;
    const CONDITIONS_NEEDED = 3;
  
    // Scoring system focused on early movement detection
    if (macdMomentumBuilding) buyScore += 2;
    if (stochRSITurning) buyScore += 1.5;
    if (rsiMomentumZone) buyScore += 1.5;
    if (aoBuilding) buyScore += 2;
    if (isPreBreakout) buyScore += 2;
    if (candleAnalysis.potentialMove === "ACCELERATION") buyScore += 2;
    if (candleAnalysis.volumePattern === "INCREASING") buyScore += 1;
  
    // Sell conditions remain similar but adjusted
    if (indicators.rsi && indicators.rsi[indicators.rsi.length - 1] > 70) sellScore += 2;
    if (indicators.stoch_rsi && indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > 80) sellScore += 2;
    if (candleAnalysis.priceAcceleration < -0.1) sellScore += 2;
  
    const resData = {
      signal: '',
      trend: candleAnalysis,
      predictiveMetrics: {
        pricePosition: closePosition.toFixed(2),
        volumeChange: volumeIncrease.toFixed(2) + "%",
        macdMomentum: macdMomentumBuilding ? "Building" : "Neutral",
        stochRSIMomentum: stochRSITurning ? "Turning Up" : "Neutral",
        aoStatus: aoBuilding ? "Building" : "Neutral",
        buyScore,
        sellScore
      }
    };
  
    // Signal generation focused on prediction
    if (buyScore >= CONDITIONS_NEEDED && 
        ['BULLISH', 'SIDEWAYS'].includes(candleAnalysis.priceTrend) &&
        (candleAnalysis.potentialMove === "ACCELERATION" || candleAnalysis.potentialMove === "VOLUME_SUPPORTED")) {
      resData.signal = "BUY";
    } else if (sellScore >= CONDITIONS_NEEDED) {
      resData.signal = "SELL";
    } else {
      resData.signal = "HOLD";
    }
    
    return resData;
  };
  
  module.exports = { analyzeCandles, shouldBuyOrSell };
  
  
  
  
  