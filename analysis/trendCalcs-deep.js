/**
 * Analyzes the given candles for market trends and predictions.
 * @param {Array} candles - Array of OHLCV candles.
 * @param {number} [analysisWindow=candles.length] - Number of candles to analyze.
 * @returns {Object} Analysis results including price and volume trends.
 */
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
  
    const lastCandle = candlesToAnalyze[candlesToAnalyze.length - 1];
    const firstCandle = candlesToAnalyze[0];
    const overallPriceChange = ((extractNumber(lastCandle[4]) - extractNumber(firstCandle[1])) / extractNumber(firstCandle[1])) * 100;  // First Open (index 1) to Last Close (index 4)
  
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
      overallPriceChange: overallPriceChange.toFixed(2) + "%",
      summary: `Market showing ${priceTrend.toLowerCase()} trend with ${potentialMove.toLowerCase()}. ` +
        `Price acceleration: ${acceleration.toFixed(3)}, Volume pattern: ${isVolumeIncreasing ? "increasing" : "mixed"}`
    };
  };
  
  /**
   * Detects advanced candlestick patterns.
   * @param {Array} candles - Array of OHLCV candles.
   * @returns {Object} Detected patterns.
   */
  const detectAdvancedPatterns = (candles) => {
    const [prev2, prev1, current] = candles.slice(-3);
  
    const isThreeWhiteSoldiers = (
      prev2[4] > prev2[1] && // Prev2 is bullish
      prev1[4] > prev1[1] && // Prev1 is bullish
      current[4] > current[1] && // Current is bullish
      prev1[4] > prev2[4] && // Each close is higher than the previous
      current[4] > prev1[4]
    );
  
    const isThreeBlackCrows = (
      prev2[4] < prev2[1] && // Prev2 is bearish
      prev1[4] < prev1[1] && // Prev1 is bearish
      current[4] < current[1] && // Current is bearish
      prev1[4] < prev2[4] && // Each close is lower than the previous
      current[4] < prev1[4]
    );
  
    return {
      isThreeWhiteSoldiers,
      isThreeBlackCrows,
    };
  };
  
  /**
   * Calculates market volatility.
   * @param {Array} candles - Array of OHLCV candles.
   * @returns {number} Average volatility.
   */
  const calculateVolatility = (candles) => {
    const priceChanges = candles.map((candle) => (candle[2] - candle[3]) / candle[1]); // (High - Low) / Open
    const avgVolatility = priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / priceChanges.length;
    return avgVolatility;
  };
  
  /**
   * Adjusts RSI thresholds based on volatility.
   * @param {number} volatility - Market volatility.
   * @returns {Object} Adjusted thresholds.
   */
  const adjustThresholds = (volatility) => {
    const RSI_OVERBOUGHT = volatility > 0.02 ? 75 : 70;
    const RSI_OVERSOLD = volatility > 0.02 ? 25 : 30;
    return { RSI_OVERBOUGHT, RSI_OVERSOLD };
  };
  
  /**
   * Determines buy/sell signals based on indicators and candles.
   * @param {Object} indicators - Technical indicators.
   * @param {Array} candles - Array of OHLCV candles.
   * @param {number} [analysisWindow=candles.length] - Number of candles to analyze.
   * @returns {Object} Signal and analysis results.
   */
  const shouldBuyOrSell = (indicators, candles, analysisWindow = candles.length) => {
    if (candles.length < 2) {
      return {
        signal: "Insufficient candle data for analysis",
        trend: null,
        predictiveMetrics: null
      };
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
  
    // Enhanced pattern detection using previousClose
    const gapUp = lastLow > previousClose;
    const gapDown = lastHigh < previousClose;
    const bullishEngulfing = lastLow < previousClose && lastClose > parseFloat(previousCandle[2]);
    const bearishEngulfing = lastHigh > previousClose && lastClose < parseFloat(previousCandle[3]);
  
    // Look for early signs of movement
    const isPreBreakout = closePosition > 0.7 && volumeIncrease > 5;
    const isBottoming = closePosition < 0.3 && volumeIncrease > 5 && lastClose > previousClose;
  
    // More predictive thresholds
    const STOCH_MOMENTUM_START = 30;  // StochRSI level for early momentum
    const MACD_SENSITIVITY = 0.05;    // MACD early cross detection
  
    // [Previous momentum detection code remains the same]
    const macdMomentumBuilding = (indicators.macd && indicators.macd.length > 2) 
        ? indicators.macd[indicators.macd.length - 1].histogram > indicators.macd[indicators.macd.length - 2].histogram &&
          Math.abs(indicators.macd[indicators.macd.length - 1].histogram) < MACD_SENSITIVITY
        : false;
  
    const stochRSITurning = (indicators.stoch_rsi && indicators.stoch_rsi.length > 1) 
        ? indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > STOCH_MOMENTUM_START &&
          indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > indicators.stoch_rsi[indicators.stoch_rsi.length - 2].k
        : false;
  
    const aoBuilding = (indicators.ao && indicators.ao.length > 3) 
        ? indicators.ao[indicators.ao.length - 1] > indicators.ao[indicators.ao.length - 2] &&
          indicators.ao[indicators.ao.length - 2] > indicators.ao[indicators.ao.length - 3] &&
          Math.abs(indicators.ao[indicators.ao.length - 1]) < 0.1
        : false;
  
    // Advanced patterns
    const advancedPatterns = detectAdvancedPatterns(candles);
  
    // Volatility-adjusted thresholds
    const volatility = calculateVolatility(candles);
    const { RSI_OVERBOUGHT, RSI_OVERSOLD } = adjustThresholds(volatility);
  
    // Weighted scoring system
    const INDICATOR_WEIGHTS = {
      macdMomentum: 2.5,
      stochRSITurning: 2,
      rsiMomentumZone: 1.5,
      aoBuilding: 2,
      isPreBreakout: 2.5,
      isBottoming: 2,
      gapUp: 1.5,
      bullishEngulfing: 1.5,
      priceAcceleration: 2,
      volumePattern: 1.5,
      rsiOverbought: 2,
      rsiOversold: 2,
      stochRSIOverbought: 2,
      stochRSIOversold: 2,
      bearishEngulfing: 1.5,
      gapDown: 1.5,
      threeWhiteSoldiers: 2.5,
      threeBlackCrows: 2.5,
    };
  
    let buyScore = 0;
    let sellScore = 0;
  
    // Buy conditions
    if (macdMomentumBuilding) buyScore += INDICATOR_WEIGHTS.macdMomentum;
    if (stochRSITurning) buyScore += INDICATOR_WEIGHTS.stochRSITurning;
    if (indicators.rsi && indicators.rsi[indicators.rsi.length - 1] < RSI_OVERSOLD) buyScore += INDICATOR_WEIGHTS.rsiOversold;
    if (aoBuilding) buyScore += INDICATOR_WEIGHTS.aoBuilding;
    if (isPreBreakout) buyScore += INDICATOR_WEIGHTS.isPreBreakout;
    if (isBottoming) buyScore += INDICATOR_WEIGHTS.isBottoming;
    if (gapUp && volumeIncrease > 10) buyScore += INDICATOR_WEIGHTS.gapUp;
    if (bullishEngulfing) buyScore += INDICATOR_WEIGHTS.bullishEngulfing;
    if (candleAnalysis.potentialMove === "ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration;
    if (candleAnalysis.volumePattern === "INCREASING") buyScore += INDICATOR_WEIGHTS.volumePattern;
    if (advancedPatterns.isThreeWhiteSoldiers) buyScore += INDICATOR_WEIGHTS.threeWhiteSoldiers;
  
    // Sell conditions
    if (indicators.rsi && indicators.rsi[indicators.rsi.length - 1] > RSI_OVERBOUGHT) sellScore += INDICATOR_WEIGHTS.rsiOverbought;
    if (indicators.stoch_rsi && indicators.stoch_rsi[indicators.stoch_rsi.length - 1].k > 80) sellScore += INDICATOR_WEIGHTS.stochRSIOverbought;
    if (candleAnalysis.priceAcceleration < -0.1) sellScore += INDICATOR_WEIGHTS.priceAcceleration;
    if (gapDown && volumeIncrease > 10) sellScore += INDICATOR_WEIGHTS.gapDown;
    if (bearishEngulfing) sellScore += INDICATOR_WEIGHTS.bearishEngulfing;
    if (advancedPatterns.isThreeBlackCrows) sellScore += INDICATOR_WEIGHTS.threeBlackCrows;
  
    const resData = {
      signal: '',
      trend: candleAnalysis,
      predictiveMetrics: {
        pricePosition: closePosition.toFixed(2),
        volumeChange: volumeIncrease.toFixed(2) + "%",
        macdMomentum: macdMomentumBuilding ? "Building" : "Neutral",
        stochRSIMomentum: stochRSITurning ? "Turning Up" : "Neutral",
        aoStatus: aoBuilding ? "Building" : "Neutral",
        patterns: {
          gapUp,
          gapDown,
          bullishEngulfing,
          bearishEngulfing,
          isBottoming,
          isPreBreakout,
          threeWhiteSoldiers: advancedPatterns.isThreeWhiteSoldiers,
          threeBlackCrows: advancedPatterns.isThreeBlackCrows,
        },
        buyScore,
        sellScore
      }
    };
  
    // Signal generation focused on prediction
    const CONDITIONS_NEEDED = 5; // Increase due to more indicators
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