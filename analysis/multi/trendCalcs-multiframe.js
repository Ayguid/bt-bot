/**
 * Analyzes the given candles for market trends and predictions.
 */
const analyzeCandles = (candles, analysisWindow = candles.length) => {
    if (candles.length < 2) {
      return { status: "Insufficient data", description: "Need at least 2 candles" };
    }
  
    const candlesToAnalyze = candles.slice(-analysisWindow);
    const extractNumber = (value) => isNaN(parseFloat(value)) ? 0 : parseFloat(value);
  
    // Price pattern analysis
    const recentCandles = candlesToAnalyze.slice(-5);
    const pricePattern = recentCandles.slice(1).map((candle, i) => {
      const prevClose = extractNumber(recentCandles[i][4]);
      const currentClose = extractNumber(candle[4]);
      return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
    });
  
    // Price acceleration
    const priceAcceleration = pricePattern.slice(1).map((change, i) => change - pricePattern[i]);
  
    // Standard calculations
    const priceChanges = candlesToAnalyze.slice(1).map((candle, i) => {
      const prevClose = extractNumber(candlesToAnalyze[i][4]);
      const currentClose = extractNumber(candle[4]);
      return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
    });
  
    const volumeChanges = candlesToAnalyze.slice(1).map((candle, i) => {
      const prevVolume = extractNumber(candlesToAnalyze[i][5]);
      const currentVolume = extractNumber(candle[5]);
      return prevVolume === 0 ? 0 : ((currentVolume - prevVolume) / prevVolume) * 100;
    });
  
    // Volume pattern
    const isVolumeIncreasing = volumeChanges.slice(-3)
      .every((change, i, arr) => i === 0 || change > arr[i-1]);
  
    const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
  
    // Overall price change
    const firstCandle = candlesToAnalyze[0];
    const lastCandle = candlesToAnalyze[candlesToAnalyze.length - 1];
    const overallPriceChange = ((extractNumber(lastCandle[4]) - extractNumber(firstCandle[1])) / extractNumber(firstCandle[1])) * 100;
  
    // Determine trend
    const acceleration = priceAcceleration.reduce((sum, acc) => sum + acc, 0) / priceAcceleration.length;
    let priceTrend, potentialMove;
    
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
  
    // Volume trend
    const volumeTrend = avgVolumeChange > 5 ? "INCREASING" : 
                       avgVolumeChange < -5 ? "DECREASING" : "STABLE";
  
    return {
      priceTrend,
      volumeTrend,
      potentialMove,
      priceAcceleration: acceleration.toFixed(3),
      avgPriceChange: avgPriceChange.toFixed(2) + "%",
      avgVolumeChange: avgVolumeChange.toFixed(2) + "%",
      volumePattern: isVolumeIncreasing ? "INCREASING" : "MIXED",
      overallPriceChange: overallPriceChange.toFixed(2) + "%",
      summary: `Market showing ${priceTrend.toLowerCase()} trend with ${potentialMove.toLowerCase()}.`
    };
  };
  
  /**
   * Detects advanced candlestick patterns
   */
  const detectAdvancedPatterns = (candles) => {
    const [prev2, prev1, current] = candles.slice(-3);
    return {
      isThreeWhiteSoldiers: (
        prev2[4] > prev2[1] && prev1[4] > prev1[1] && current[4] > current[1] &&
        prev1[4] > prev2[4] && current[4] > prev1[4]
      ),
      isThreeBlackCrows: (
        prev2[4] < prev2[1] && prev1[4] < prev1[1] && current[4] < current[1] &&
        prev1[4] < prev2[4] && current[4] < prev1[4]
      )
    };
  };
  
  /**
   * Calculates market volatility
   */
  const calculateVolatility = (candles) => {
    const priceChanges = candles.map(c => (c[2] - c[3]) / c[1]);
    return priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / priceChanges.length;
  };
  
  /**
   * Adjusts RSI thresholds based on volatility
   */
  const adjustThresholds = (volatility) => ({
    RSI_OVERBOUGHT: volatility > 0.02 ? 75 : 70,
    RSI_OVERSOLD: volatility > 0.02 ? 25 : 30
  });
  
  /**
   * Multi-timeframe analysis core function
   */
  const analyzeMultipleTimeframes = (allIndicators, allCandles, options = {}) => {
    const timeframes = Object.keys(allCandles);
    const signals = [];
    const weights = options.weights || { '1h': 1, '2h': 1.5, '4h': 2, '1d': 3 };
    let totalWeight = 0;
    let weightedBuyScore = 0;
    let weightedSellScore = 0;
  
    timeframes.forEach(timeframe => {
      const candles = allCandles[timeframe];
      const indicators = allIndicators[timeframe];
      const timeframeWindow = Math.ceil(
        (options.analysisWindow * (parseInt(options.primaryTimeframe || '2h'))) / 
        (parseInt(timeframe) || (timeframe.includes('h') ? parseInt(timeframe.replace('h', '')) : 1))
      );
  
      const result = shouldBuyOrSell(indicators, candles, timeframeWindow);
      const weight = weights[timeframe] || 1;
      
      signals.push({
        timeframe,
        signal: result.signal,
        weight,
        details: result
      });
  
      weightedBuyScore += result.predictiveMetrics.buyScore * weight;
      weightedSellScore += result.predictiveMetrics.sellScore * weight;
      totalWeight += weight;
    });
  
    const normalizedBuyScore = weightedBuyScore / totalWeight;
    const normalizedSellScore = weightedSellScore / totalWeight;
    const consensusSignal = 
      normalizedBuyScore > 5 && normalizedBuyScore > normalizedSellScore ? "BUY" :
      normalizedSellScore > 5 && normalizedSellScore > normalizedBuyScore ? "SELL" : "HOLD";
  
    return {
      consensusSignal,
      signals,
      normalizedBuyScore,
      normalizedSellScore,
      timeframesAnalyzed: timeframes
    };
  };
  
  /**
   * Main signal generation function
   */
  const shouldBuyOrSell = (indicators, candles, analysisWindow = candles.length) => {
    if (candles.length < 2) {
      return {
        signal: "Insufficient data",
        trend: null,
        predictiveMetrics: null
      };
    }
  
    const candleAnalysis = analyzeCandles(candles, analysisWindow);
    const lastCandle = candles[candles.length - 1];
    const previousCandle = candles[candles.length - 2];
  
    // Extract key values
    const lastClose = parseFloat(lastCandle[4]);
    const previousClose = parseFloat(previousCandle[4]);
    const priceRange = parseFloat(lastCandle[2]) - parseFloat(lastCandle[3]);
    const closePosition = priceRange > 0 ? (lastClose - parseFloat(lastCandle[3])) / priceRange : 0;
    const volumeIncrease = ((parseFloat(lastCandle[5]) - parseFloat(previousCandle[5])) / parseFloat(previousCandle[5])) * 100;
  
    // Pattern detection
    const advancedPatterns = detectAdvancedPatterns(candles);
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
  
    // Buy conditions (abbreviated for space)
    if (indicators.macd?.histogram?.length > 2 && 
        indicators.macd.histogram.slice(-1)[0] > indicators.macd.histogram.slice(-2)[0] && 
        Math.abs(indicators.macd.histogram.slice(-1)[0]) < 0.05) {
      buyScore += INDICATOR_WEIGHTS.macdMomentum;
    }
    // ... (include all your other buy/sell conditions)
  
    const resData = {
      signal: '',
      trend: candleAnalysis,
      predictiveMetrics: {
        pricePosition: closePosition.toFixed(2),
        volumeChange: volumeIncrease.toFixed(2) + "%",
        patterns: advancedPatterns,
        buyScore,
        sellScore
      }
    };
  
    // Signal generation
    const CONDITIONS_NEEDED = 5;
    if (buyScore >= CONDITIONS_NEEDED && ['BULLISH', 'SIDEWAYS'].includes(candleAnalysis.priceTrend)) {
      resData.signal = "BUY";
    } else if (sellScore >= CONDITIONS_NEEDED) {
      resData.signal = "SELL";
    } else {
      resData.signal = "HOLD";
    }
    
    return resData;
  };
  
  module.exports = { 
    analyzeCandles, 
    shouldBuyOrSell, 
    analyzeMultipleTimeframes,
    detectAdvancedPatterns,
    calculateVolatility,
    adjustThresholds 
  };