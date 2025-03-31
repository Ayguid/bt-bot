// Enhanced Indicator Analysis Utilities
const IndicatorUtils = {
    extractNumber: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    },
  
    calculatePercentageChange: (current, previous) => {
        if (previous === 0) return 0;
        const change = ((current - previous) / previous) * 100;
        return parseFloat(change.toFixed(4));
    },
  
    isIncreasing: (values, lookback = 3) => {
        if (!values || values.length < lookback) return false;
        const slice = values.slice(-lookback);
        return slice.every((val, i) => i === 0 || val > slice[i-1]);
    },
    
    isDecreasing: (values, lookback = 3) => {
        if (!values || values.length < lookback) return false;
        const slice = values.slice(-lookback);
        return slice.every((val, i) => i === 0 || val < slice[i-1]);
    }
};

// Enhanced Price Analysis Module
const PriceAnalyzer = {
    analyzeTrend: (candles, windowSize) => {
        if (candles.length < 5) return null;
        
        const slicedCandles = candles.slice(-windowSize);
        const priceChanges = slicedCandles.slice(1).map((candle, i) => {
            return IndicatorUtils.calculatePercentageChange(
                IndicatorUtils.extractNumber(candle[4]),
                IndicatorUtils.extractNumber(slicedCandles[i][4])
            );
        });

        const pricePattern = candles.slice(-8).slice(1).map((candle, i) => {
            return IndicatorUtils.calculatePercentageChange(
                IndicatorUtils.extractNumber(candle[4]),
                IndicatorUtils.extractNumber(candles.slice(-8)[i][4])
            );
        });

        const priceAcceleration = pricePattern.slice(1).map((change, i) => 
            change - pricePattern[i]
        );
        
        const acceleration = priceAcceleration.length > 0 ? 
            priceAcceleration.reduce((sum, acc) => sum + acc, 0) / priceAcceleration.length : 0;
            
        const avgPriceChange = priceChanges.length > 0 ? 
            priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length : 0;

        return { 
            priceChanges, 
            acceleration: parseFloat(acceleration.toFixed(4)),
            avgPriceChange: parseFloat(avgPriceChange.toFixed(2))
        };
    },

    getOverallChange: (candles) => {
        if (candles.length < 2) return 0;
        const first = candles[0];
        const last = candles[candles.length - 1];
        return IndicatorUtils.calculatePercentageChange(
            IndicatorUtils.extractNumber(last[4]),
            IndicatorUtils.extractNumber(first[1])
        );
    }
};

// Enhanced Volume Analysis Module
const VolumeAnalyzer = {
    analyze: (candles, windowSize) => {
        const slicedCandles = candles.slice(-windowSize);
        const volumeChanges = slicedCandles.slice(1).map((candle, i) => {
            return IndicatorUtils.calculatePercentageChange(
                IndicatorUtils.extractNumber(candle[5]),
                IndicatorUtils.extractNumber(slicedCandles[i][5])
            );
        });

        const isIncreasing = IndicatorUtils.isIncreasing(volumeChanges);
        const isDecreasing = IndicatorUtils.isDecreasing(volumeChanges);
        const avgChange = volumeChanges.length > 0 ? 
            volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length : 0;

        let trend;
        if (avgChange > 5 && isIncreasing) trend = "STRONG_INCREASING";
        else if (avgChange > 5) trend = "INCREASING";
        else if (avgChange < -5 && isDecreasing) trend = "STRONG_DECREASING";
        else if (avgChange < -5) trend = "DECREASING";
        else trend = "STABLE";

        return {
            changes: volumeChanges,
            isIncreasing,
            avgChange: parseFloat(avgChange.toFixed(2)),
            trend
        };
    }
};

// Enhanced Pattern Detector Module
const PatternDetector = {
    detectCandlestick: (candles) => {
        if (candles.length < 3) return {};
        
        const [prev2, prev1, current] = candles.slice(-3);
        const bodySize = (candle) => Math.abs(candle[4] - candle[1]);
        const minBodySize = Math.min(
            bodySize(prev2), 
            bodySize(prev1), 
            bodySize(current)
        ) * 0.5;
        
        return {
            isThreeWhiteSoldiers: (
                prev2[4] > prev2[1] && 
                prev1[4] > prev1[1] && 
                current[4] > current[1] &&
                bodySize(prev1) > minBodySize &&
                bodySize(current) > minBodySize &&
                prev1[4] > prev2[4] && 
                current[4] > prev1[4]
            ),
            isThreeBlackCrows: (
                prev2[4] < prev2[1] && 
                prev1[4] < prev1[1] && 
                current[4] < current[1] &&
                bodySize(prev1) > minBodySize &&
                bodySize(current) > minBodySize &&
                prev1[4] < prev2[4] && 
                current[4] < prev1[4]
            )
        };
    },

    detectEngulfing: (lastCandle, previousCandle) => {
        const lastBody = Math.abs(lastCandle[4] - lastCandle[1]);
        const prevBody = Math.abs(previousCandle[4] - previousCandle[1]);
        
        return {
            bullish: (
                lastCandle[4] > lastCandle[1] &&
                previousCandle[4] < previousCandle[1] &&
                lastBody > prevBody * 1.5 &&
                lastCandle[4] > previousCandle[1] &&
                lastCandle[1] < previousCandle[4]
            ),
            bearish: (
                lastCandle[4] < lastCandle[1] &&
                previousCandle[4] > previousCandle[1] &&
                lastBody > prevBody * 1.5 &&
                lastCandle[4] < previousCandle[1] &&
                lastCandle[1] > previousCandle[4]
            )
        };
    },

    detectGaps: (lastCandle, previousCandle) => ({
        gapUp: lastCandle[1] > previousCandle[4] * 1.005,
        gapDown: lastCandle[1] < previousCandle[4] * 0.995
    })
};

// Enhanced Indicator Analysis Module
const IndicatorAnalyzer = {
    analyzeMACD: (macdData) => {
        if (!macdData?.histogram?.length) return {};
        
        const hist = macdData.histogram;
        const last = hist[hist.length - 1];
        const prev = hist[hist.length - 2];
        const prev2 = hist[hist.length - 3];
        
        // return {
        //     isBuilding: hist.length > 2 && 
        //         last > prev && 
        //         Math.abs(last) < 0.05,
        //     isStrongBuilding: hist.length > 3 && 
        //         last > prev && 
        //         prev > prev2 && 
        //         Math.abs(last) < 0.03
        // };
        //Stricter MACD Conditions:
        return {
            isBuilding: hist.length > 3 && last > prev && prev > prev2 && Math.abs(last) > (0.02 * currentPrice),
            isStrongBuilding: hist.length > 5 && last > prev && prev > prev2 && prev2 > hist[hist.length-4] && Math.abs(last) > (0.03 * currentPrice)
        };
    },

    analyzeStochRSI: (stochRsiData) => {
        if (!stochRsiData?.length) return {};
        
        const last = stochRsiData[stochRsiData.length - 1];
        const prev = stochRsiData[stochRsiData.length - 2];
        
        return {
            isTurningUp: last.k > 30 && last.k > prev.k,
            isOverbought: last.k > 80,
            isOversold: last.k < 20,
            bullishDivergence: stochRsiData.length > 5 && 
                last.k > prev.k && 
                stochRsiData.slice(-5).some(p => p.k < 30)
        };
    },

    analyzeAO: (aoData) => {
        if (!aoData?.length) return {};
        
        const last = aoData[aoData.length - 1];
        const prev = aoData[aoData.length - 2];
        const prev2 = aoData[aoData.length - 3];
        
        return {
            isBuilding: aoData.length > 3 && 
                last > prev && 
                prev > prev2,
            isAboveZero: last > 0,
            isBelowZero: last < 0
        };
    },

    analyzeRSI: (rsiData, thresholds) => {
        if (!rsiData?.length) return {};
        
        const last = rsiData[rsiData.length - 1];
        const prev = rsiData[rsiData.length - 2];
        
        // return {
        //     isOversold: last < (thresholds?.RSI_OVERSOLD || 30),
        //     isOverbought: last > (thresholds?.RSI_OVERBOUGHT || 70),
        //     isRising: last > prev,
        //     isFalling: last < prev
        // };
        //More Conservative RSI Thresholds:
        return {
            isOversold: last < (thresholds?.RSI_OVERSOLD || 25),  // Changed from 30
            isOverbought: last > (thresholds?.RSI_OVERBOUGHT || 75), // Changed from 70
            isRising: last > (prev + 2), // Requires stronger momentum
            isFalling: last < (prev - 2)
        };
    }
};

// Enhanced Main Analysis Class
class MarketAnalyzer {
    static analyzeCandles(candles, analysisWindow = candles.length) {
        if (candles.length < 5) {
            return { status: "Insufficient data", description: "Need at least 5 candles" };
        }

        const priceAnalysis = PriceAnalyzer.analyzeTrend(candles, analysisWindow);
        const volumeAnalysis = VolumeAnalyzer.analyze(candles, analysisWindow);
        const overallPriceChange = PriceAnalyzer.getOverallChange(candles.slice(-analysisWindow));

        let priceTrend, potentialMove, confidence = "MEDIUM";
        
        if (priceAnalysis.acceleration > 0.15) {
            priceTrend = "BULLISH";
            potentialMove = "STRONG_ACCELERATION";
            confidence = "HIGH";
        } else if (priceAnalysis.acceleration > 0.1) {
            priceTrend = "BULLISH";
            potentialMove = "ACCELERATION";
        } else if (priceAnalysis.avgPriceChange > 0.2 && volumeAnalysis.trend === "STRONG_INCREASING") {
            priceTrend = "BULLISH";
            potentialMove = "STRONG_VOLUME_SUPPORT";
            confidence = "HIGH";
        } else if (priceAnalysis.avgPriceChange > 0.2 && volumeAnalysis.isIncreasing) {
            priceTrend = "BULLISH";
            potentialMove = "VOLUME_SUPPORTED";
        } else if (priceAnalysis.avgPriceChange < -0.2 && volumeAnalysis.trend === "STRONG_DECREASING") {
            priceTrend = "BEARISH";
            potentialMove = "STRONG_REVERSAL";
            confidence = "HIGH";
        } else if (priceAnalysis.avgPriceChange < -0.2) {
            priceTrend = "BEARISH";
            potentialMove = "REVERSAL_POSSIBLE";
        } else {
            priceTrend = "SIDEWAYS";
            potentialMove = "CONSOLIDATION";
            confidence = "LOW";
        }

        return {
            priceTrend,
            volumeTrend: volumeAnalysis.trend,
            potentialMove,
            confidence,
            priceAcceleration: priceAnalysis.acceleration,
            avgPriceChange: priceAnalysis.avgPriceChange,
            avgVolumeChange: volumeAnalysis.avgChange,
            volumePattern: volumeAnalysis.isIncreasing ? "INCREASING" : "MIXED",
            overallPriceChange,
            summary: `${priceTrend} market (${confidence} confidence) with ${potentialMove.replace('_', ' ').toLowerCase()}`
        };
    }

    static shouldBuyOrSell(indicators, candles, analysisWindow = candles.length) {
        if (candles.length < 2) {
            return {
                signal: "Insufficient data",
                trend: null,
                predictiveMetrics: null
            };
        }

        const candleAnalysis = this.analyzeCandles(candles, analysisWindow);
        const lastCandle = candles[candles.length - 1];
        const previousCandle = candles[candles.length - 2];

        const lastClose = IndicatorUtils.extractNumber(lastCandle[4]);
        const previousClose = IndicatorUtils.extractNumber(previousCandle[4]);
        const priceRange = IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3]);
        const closePosition = priceRange > 0 ? 
            (lastClose - IndicatorUtils.extractNumber(lastCandle[3])) / priceRange : 0;
        const volumeIncrease = IndicatorUtils.calculatePercentageChange(
            IndicatorUtils.extractNumber(lastCandle[5]),
            IndicatorUtils.extractNumber(previousCandle[5])
        );

        const advancedPatterns = PatternDetector.detectCandlestick(candles);
        const engulfingPatterns = PatternDetector.detectEngulfing(lastCandle, previousCandle);
        const gaps = PatternDetector.detectGaps(lastCandle, previousCandle);

        const volatility = (IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3])) / 
            IndicatorUtils.extractNumber(lastCandle[1]);
        const thresholds = { 
            RSI_OVERBOUGHT: volatility > 0.02 ? 75 : 70, 
            RSI_OVERSOLD: volatility > 0.02 ? 25 : 30 
        };

        const macdAnalysis = IndicatorAnalyzer.analyzeMACD(indicators.macd);
        const stochRsiAnalysis = IndicatorAnalyzer.analyzeStochRSI(indicators.stoch_rsi);
        const aoAnalysis = IndicatorAnalyzer.analyzeAO(indicators.ao);
        const rsiAnalysis = IndicatorAnalyzer.analyzeRSI(indicators.rsi, thresholds);

        const { buyScore, sellScore } = this.calculateScores({
            candleAnalysis,
            macdAnalysis,
            stochRsiAnalysis,
            aoAnalysis,
            rsiAnalysis,
            advancedPatterns,
            engulfingPatterns,
            gaps,
            closePosition,
            volumeIncrease,
            lastClose,
            previousClose
        });

        const signal = this.generateSignal(buyScore, sellScore, candleAnalysis.priceTrend);

        return {
            signal,
            trend: candleAnalysis,
            predictiveMetrics: {
                pricePosition: closePosition.toFixed(2),
                volumeChange: volumeIncrease.toFixed(2) + "%",
                patterns: {
                    ...advancedPatterns,
                    bullishEngulfing: engulfingPatterns.bullish,
                    bearishEngulfing: engulfingPatterns.bearish,
                    gapUp: gaps.gapUp,
                    gapDown: gaps.gapDown,
                    isBottoming: closePosition < 0.3 && volumeIncrease > 5 && lastClose > previousClose,
                    isPreBreakout: closePosition > 0.7 && volumeIncrease > 5
                },
                buyScore,
                sellScore
            }
        };
    }

    static calculateScores(analysis) {
        const INDICATOR_WEIGHTS = {
            macdMomentum: 1.5,       // Was 2.5
            macdStrongBuilding: 2.5, // Was 3.5
            stochRSITurning: 1.2,      // Was 2
            stochRSIBullishDivergence: 3,
            rsiOversold: 2,
            rsiRising: 1.5,
            aoBuilding: 2,
            aoAboveZero: 1.5,
            isPreBreakout: 2.5,
            isBottoming: 2,
            gapUp: 1.5,
            bullishEngulfing: 1.5,
            priceAcceleration: 2.2,  // Increased from 2
            volumePattern: 1.5,
            rsiOverbought: 2.2,      // Increased from 2
            stochRSIOverbought: 2.5, // Increased from 2
            bearishEngulfing: 2,     // Increased from 1.5
            gapDown: 2,              // Increased from 1.5
            threeWhiteSoldiers: 2.5,
            threeBlackCrows: 3,      // Increased from 2.5
            // Added new filters
            // requiresConfirmation: {
            //     volumeSpike: currentVolume > (avgVolume * 1.5),
            //     priceAboveEMA: currentPrice > ema
            // }
        };

        let buyScore = 0;
        let sellScore = 0;

        // Buy conditions
        if (analysis.macdAnalysis.isBuilding) buyScore += INDICATOR_WEIGHTS.macdMomentum;
        if (analysis.macdAnalysis.isStrongBuilding) buyScore += INDICATOR_WEIGHTS.macdStrongBuilding;
        if (analysis.stochRsiAnalysis.isTurningUp) buyScore += INDICATOR_WEIGHTS.stochRSITurning;
        if (analysis.stochRsiAnalysis.bullishDivergence) buyScore += INDICATOR_WEIGHTS.stochRSIBullishDivergence;
        if (analysis.rsiAnalysis.isOversold) buyScore += INDICATOR_WEIGHTS.rsiOversold;
        if (analysis.rsiAnalysis.isRising) buyScore += INDICATOR_WEIGHTS.rsiRising;
        if (analysis.aoAnalysis.isBuilding) buyScore += INDICATOR_WEIGHTS.aoBuilding;
        if (analysis.aoAnalysis.isAboveZero) buyScore += INDICATOR_WEIGHTS.aoAboveZero;
        if (analysis.closePosition > 0.7 && analysis.volumeIncrease > 5) buyScore += INDICATOR_WEIGHTS.isPreBreakout;
        if (analysis.closePosition < 0.3 && analysis.volumeIncrease > 5 && analysis.lastClose > analysis.previousClose) {
            buyScore += INDICATOR_WEIGHTS.isBottoming;
        }
        if (analysis.gaps.gapUp && analysis.volumeIncrease > 10) buyScore += INDICATOR_WEIGHTS.gapUp;
        if (analysis.engulfingPatterns.bullish) buyScore += INDICATOR_WEIGHTS.bullishEngulfing;
        if (analysis.candleAnalysis.potentialMove === "STRONG_ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration * 1.5;
        else if (analysis.candleAnalysis.potentialMove === "ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration;
        if (analysis.candleAnalysis.volumePattern === "INCREASING") buyScore += INDICATOR_WEIGHTS.volumePattern;
        if (analysis.advancedPatterns.isThreeWhiteSoldiers) buyScore += INDICATOR_WEIGHTS.threeWhiteSoldiers;

        // Sell conditions
        if (analysis.rsiAnalysis.isOverbought) sellScore += INDICATOR_WEIGHTS.rsiOverbought;
        if (analysis.stochRsiAnalysis.isOverbought) sellScore += INDICATOR_WEIGHTS.stochRSIOverbought;
        if (analysis.rsiAnalysis.isFalling) sellScore += INDICATOR_WEIGHTS.rsiRising;
        if (analysis.aoAnalysis.isBelowZero) sellScore += INDICATOR_WEIGHTS.aoAboveZero;
        if (parseFloat(analysis.candleAnalysis.priceAcceleration) < -0.1) sellScore += INDICATOR_WEIGHTS.priceAcceleration;
        if (analysis.gaps.gapDown && analysis.volumeIncrease > 10) sellScore += INDICATOR_WEIGHTS.gapDown;
        if (analysis.engulfingPatterns.bearish) sellScore += INDICATOR_WEIGHTS.bearishEngulfing;
        if (analysis.advancedPatterns.isThreeBlackCrows) sellScore += INDICATOR_WEIGHTS.threeBlackCrows;

        return { buyScore, sellScore };
    }

    static generateSignal(buyScore, sellScore, priceTrend) {
        const CONDITIONS_NEEDED = 7;        // Was 5
        const STRONG_CONDITIONS_NEEDED = 10; // Was 7
        //const MIN_CONFIRMATIONS = 2;        // Require multiple timeframe confirmation
        
        if (buyScore >= STRONG_CONDITIONS_NEEDED && ['BULLISH', 'SIDEWAYS'].includes(priceTrend)) {
            return "STRONG_BUY";
        }
        if (buyScore >= CONDITIONS_NEEDED && ['BULLISH', 'SIDEWAYS'].includes(priceTrend)) {
            return "BUY";
        }
        if (sellScore >= STRONG_CONDITIONS_NEEDED) {
            return "STRONG_SELL";
        }
        if (sellScore >= CONDITIONS_NEEDED) {
            return "SELL";
        }
        return "HOLD";
    }

    static analyzeMultipleTimeframes(allIndicators, allCandles, options = {}) {
        const parseTimeframeToHours = (tf) => {
            if (!tf) return 2;
            if (typeof tf === 'number') return tf;
            if (tf.includes('h')) return parseInt(tf.replace('h', '')) || 1;
            if (tf.includes('d')) return (parseInt(tf.replace('d', '')) || 1) * 24;
            return parseInt(tf) || 1;
        };
    
        const timeframes = Object.keys(allCandles);
        const weights = options.weights || { '1h': 1, '2h': 1.5, '4h': 2, '1d': 3 };
        
        const { signals, weightedBuyScore, weightedSellScore, totalWeight } = timeframes.reduce((acc, timeframe) => {
            const candles = allCandles[timeframe];
            const indicators = allIndicators[timeframe];
            
            const primaryHours = parseTimeframeToHours(options.primaryTimeframe);
            const currentHours = parseTimeframeToHours(timeframe);
            const timeframeWindow = Math.ceil(
                (options.analysisWindow * primaryHours) / currentHours
            );
    
            const result = this.shouldBuyOrSell(indicators, candles, timeframeWindow);
            const weight = weights[timeframe] || 1;
            
            acc.signals.push({
                timeframe,
                signal: result.signal,
                weight,
                details: result
            });
    
            // Enhanced scoring for strong signals
            const signalMultiplier = result.signal.includes('STRONG_') ? 1.5 : 1;
            acc.weightedBuyScore += result.predictiveMetrics.buyScore * weight * signalMultiplier;
            acc.weightedSellScore += result.predictiveMetrics.sellScore * weight * signalMultiplier;
            acc.totalWeight += weight;
    
            return acc;
        }, { signals: [], weightedBuyScore: 0, weightedSellScore: 0, totalWeight: 0 });
    
        const normalizedBuyScore = weightedBuyScore / totalWeight;
        const normalizedSellScore = weightedSellScore / totalWeight;
    
        return {
            consensusSignal: 
                normalizedBuyScore > 7 ? "STRONG_BUY" :
                normalizedBuyScore > 5 ? "BUY" :
                normalizedSellScore > 7 ? "STRONG_SELL" :
                normalizedSellScore > 5 ? "SELL" : "HOLD",
            signals,
            normalizedBuyScore,
            normalizedSellScore,
            timeframesAnalyzed: timeframes
        };
    }
}

module.exports = MarketAnalyzer;
/*
// Indicator Analysis Utilities
const IndicatorUtils = {
    // Extract numeric value safely
    extractNumber: (value) => isNaN(parseFloat(value)) ? 0 : parseFloat(value),
  
    // Calculate percentage change
    calculatePercentageChange: (current, previous) => 
      previous === 0 ? 0 : ((current - previous) / previous) * 100,
  
    // Check if values are increasing
    isIncreasing: (values) => 
      values.every((val, i, arr) => i === 0 || val > arr[i-1])
  };
  
  // Price Analysis Module
  const PriceAnalyzer = {
    analyzeTrend: (candles, windowSize) => {
      const slicedCandles = candles.slice(-windowSize);
      
      // Calculate price changes
      const priceChanges = slicedCandles.slice(1).map((candle, i) => {
        const prevClose = IndicatorUtils.extractNumber(slicedCandles[i][4]);
        const currentClose = IndicatorUtils.extractNumber(candle[4]);
        return IndicatorUtils.calculatePercentageChange(currentClose, prevClose);
      });
  
      // Calculate price acceleration
      const pricePattern = candles.slice(-5).slice(1).map((candle, i) => {
        const prevClose = IndicatorUtils.extractNumber(candles.slice(-5)[i][4]);
        const currentClose = IndicatorUtils.extractNumber(candle[4]);
        return IndicatorUtils.calculatePercentageChange(currentClose, prevClose);
      });
  
      const priceAcceleration = pricePattern.slice(1).map((change, i) => change - pricePattern[i]);
      const acceleration = priceAcceleration.reduce((sum, acc) => sum + acc, 0) / priceAcceleration.length;
      const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
  
      return { priceChanges, acceleration, avgPriceChange };
    },
  
    getOverallChange: (candles) => {
      const first = candles[0];
      const last = candles[candles.length - 1];
      return IndicatorUtils.calculatePercentageChange(
        IndicatorUtils.extractNumber(last[4]),
        IndicatorUtils.extractNumber(first[1])
      );
    }
  };
  
  // Volume Analysis Module
  const VolumeAnalyzer = {
    analyze: (candles, windowSize) => {
      const slicedCandles = candles.slice(-windowSize);
      
      const volumeChanges = slicedCandles.slice(1).map((candle, i) => {
        const prevVolume = IndicatorUtils.extractNumber(slicedCandles[i][5]);
        const currentVolume = IndicatorUtils.extractNumber(candle[5]);
        return IndicatorUtils.calculatePercentageChange(currentVolume, prevVolume);
      });
  
      const isIncreasing = IndicatorUtils.isIncreasing(volumeChanges.slice(-3));
      const avgChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
  
      return {
        changes: volumeChanges,
        isIncreasing,
        avgChange,
        trend: avgChange > 5 ? "INCREASING" : avgChange < -5 ? "DECREASING" : "STABLE"
      };
    }
  };
  
  // Pattern Detector Module
  const PatternDetector = {
    detectCandlestick: (candles) => {
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
    },
  
    detectEngulfing: (lastCandle, previousCandle) => {
      const lastClose = IndicatorUtils.extractNumber(lastCandle[4]);
      const prevClose = IndicatorUtils.extractNumber(previousCandle[4]);
      
      return {
        bullish: IndicatorUtils.extractNumber(lastCandle[3]) < prevClose && 
                lastClose > IndicatorUtils.extractNumber(previousCandle[2]),
        bearish: IndicatorUtils.extractNumber(lastCandle[2]) > prevClose && 
                lastClose < IndicatorUtils.extractNumber(previousCandle[3])
      };
    },
  
    detectGaps: (lastCandle, previousCandle) => ({
      gapUp: IndicatorUtils.extractNumber(lastCandle[3]) > IndicatorUtils.extractNumber(previousCandle[4]),
      gapDown: IndicatorUtils.extractNumber(lastCandle[2]) < IndicatorUtils.extractNumber(previousCandle[4])
    })
  };
  
  // Indicator Analysis Module
  const IndicatorAnalyzer = {
    analyzeMACD: (macdData) => ({
      isBuilding: macdData?.histogram?.length > 2 && 
        macdData.histogram[macdData.histogram.length - 1] > macdData.histogram[macdData.histogram.length - 2] && 
        Math.abs(macdData.histogram[macdData.histogram.length - 1]) < 0.05
    }),
  
    analyzeStochRSI: (stochRsiData) => ({
      isTurningUp: stochRsiData?.length > 1 && 
        stochRsiData[stochRsiData.length - 1].k > 30 &&
        stochRsiData[stochRsiData.length - 1].k > stochRsiData[stochRsiData.length - 2].k,
      isOverbought: stochRsiData?.[stochRsiData.length - 1]?.k > 80
    }),
  
    analyzeAO: (aoData) => ({
      isBuilding: aoData?.length > 3 && 
        aoData[aoData.length - 1] > aoData[aoData.length - 2] &&
        aoData[aoData.length - 2] > aoData[aoData.length - 3] &&
        Math.abs(aoData[aoData.length - 1]) < 0.1
    }),
  
    analyzeRSI: (rsiData, thresholds) => ({
      isOversold: rsiData?.[rsiData.length - 1] < thresholds.RSI_OVERSOLD,
      isOverbought: rsiData?.[rsiData.length - 1] > thresholds.RSI_OVERBOUGHT
    })
  };
  
  // Main Analysis Class
  class MarketAnalyzer {
    static analyzeCandles(candles, analysisWindow = candles.length) {
      if (candles.length < 2) {
        return { status: "Insufficient data", description: "Need at least 2 candles" };
      }
  
      const priceAnalysis = PriceAnalyzer.analyzeTrend(candles, analysisWindow);
      const volumeAnalysis = VolumeAnalyzer.analyze(candles, analysisWindow);
      const overallPriceChange = PriceAnalyzer.getOverallChange(candles.slice(-analysisWindow));
  
      // Determine trend
      let priceTrend, potentialMove;
      if (priceAnalysis.acceleration > 0.1) {
        priceTrend = "BULLISH";
        potentialMove = "ACCELERATION";
      } else if (priceAnalysis.avgPriceChange > 0.2 && volumeAnalysis.isIncreasing) {
        priceTrend = "BULLISH";
        potentialMove = "VOLUME_SUPPORTED";
      } else if (priceAnalysis.avgPriceChange < -0.2) {
        priceTrend = "BEARISH";
        potentialMove = "REVERSAL_POSSIBLE";
      } else {
        priceTrend = "SIDEWAYS";
        potentialMove = "CONSOLIDATION";
      }
  
      return {
        priceTrend,
        volumeTrend: volumeAnalysis.trend,
        potentialMove,
        priceAcceleration: priceAnalysis.acceleration.toFixed(3),
        avgPriceChange: priceAnalysis.avgPriceChange.toFixed(2) + "%",
        avgVolumeChange: volumeAnalysis.avgChange.toFixed(2) + "%",
        volumePattern: volumeAnalysis.isIncreasing ? "INCREASING" : "MIXED",
        overallPriceChange: overallPriceChange.toFixed(2) + "%",
        summary: `Market showing ${priceTrend.toLowerCase()} trend with ${potentialMove.toLowerCase()}.`
      };
    }
  
    static shouldBuyOrSell(indicators, candles, analysisWindow = candles.length) {
      if (candles.length < 2) {
        return {
          signal: "Insufficient data",
          trend: null,
          predictiveMetrics: null
        };
      }
  
      const candleAnalysis = this.analyzeCandles(candles, analysisWindow);
      const lastCandle = candles[candles.length - 1];
      const previousCandle = candles[candles.length - 2];
  
      // Extract key price/volume metrics
      const lastClose = IndicatorUtils.extractNumber(lastCandle[4]);
      const previousClose = IndicatorUtils.extractNumber(previousCandle[4]);
      const priceRange = IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3]);
      const closePosition = priceRange > 0 ? 
        (lastClose - IndicatorUtils.extractNumber(lastCandle[3])) / priceRange : 0;
      const volumeIncrease = IndicatorUtils.calculatePercentageChange(
        IndicatorUtils.extractNumber(lastCandle[5]),
        IndicatorUtils.extractNumber(previousCandle[5])
      );
  
      // Detect patterns
      const advancedPatterns = PatternDetector.detectCandlestick(candles);
      const engulfingPatterns = PatternDetector.detectEngulfing(lastCandle, previousCandle);
      const gaps = PatternDetector.detectGaps(lastCandle, previousCandle);
  
      // Analyze indicators
      const volatility = (IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3])) / 
        IndicatorUtils.extractNumber(lastCandle[1]);
      const thresholds = { 
        RSI_OVERBOUGHT: volatility > 0.02 ? 75 : 70, 
        RSI_OVERSOLD: volatility > 0.02 ? 25 : 30 
      };
  
      const macdAnalysis = IndicatorAnalyzer.analyzeMACD(indicators.macd);
      const stochRsiAnalysis = IndicatorAnalyzer.analyzeStochRSI(indicators.stoch_rsi);
      const aoAnalysis = IndicatorAnalyzer.analyzeAO(indicators.ao);
      const rsiAnalysis = IndicatorAnalyzer.analyzeRSI(indicators.rsi, thresholds);
  
      // Calculate scores
      const { buyScore, sellScore } = this.calculateScores({
        candleAnalysis,
        macdAnalysis,
        stochRsiAnalysis,
        aoAnalysis,
        rsiAnalysis,
        advancedPatterns,
        engulfingPatterns,
        gaps,
        closePosition,
        volumeIncrease,
        lastClose,
        previousClose
      });
  
      // Generate signal
      const signal = this.generateSignal(buyScore, sellScore, candleAnalysis.priceTrend);
  
      return {
        signal,
        trend: candleAnalysis,
        predictiveMetrics: {
          pricePosition: closePosition.toFixed(2),
          volumeChange: volumeIncrease.toFixed(2) + "%",
          patterns: {
            ...advancedPatterns,
            bullishEngulfing: engulfingPatterns.bullish,
            bearishEngulfing: engulfingPatterns.bearish,
            gapUp: gaps.gapUp,
            gapDown: gaps.gapDown,
            isBottoming: closePosition < 0.3 && volumeIncrease > 5 && lastClose > previousClose,
            isPreBreakout: closePosition > 0.7 && volumeIncrease > 5
          },
          buyScore,
          sellScore
        }
      };
    }
  
    static calculateScores(analysis) {
      const INDICATOR_WEIGHTS = {
        macdMomentum: 2.5,
        stochRSITurning: 2,
        rsiOversold: 2,
        aoBuilding: 2,
        isPreBreakout: 2.5,
        isBottoming: 2,
        gapUp: 1.5,
        bullishEngulfing: 1.5,
        priceAcceleration: 2,
        volumePattern: 1.5,
        rsiOverbought: 2,
        stochRSIOverbought: 2,
        bearishEngulfing: 1.5,
        gapDown: 1.5,
        threeWhiteSoldiers: 2.5,
        threeBlackCrows: 2.5,
      };
  
      let buyScore = 0;
      let sellScore = 0;
  
      // Buy conditions
      if (analysis.macdAnalysis.isBuilding) buyScore += INDICATOR_WEIGHTS.macdMomentum;
      if (analysis.stochRsiAnalysis.isTurningUp) buyScore += INDICATOR_WEIGHTS.stochRSITurning;
      if (analysis.rsiAnalysis.isOversold) buyScore += INDICATOR_WEIGHTS.rsiOversold;
      if (analysis.aoAnalysis.isBuilding) buyScore += INDICATOR_WEIGHTS.aoBuilding;
      if (analysis.closePosition > 0.7 && analysis.volumeIncrease > 5) buyScore += INDICATOR_WEIGHTS.isPreBreakout;
      if (analysis.closePosition < 0.3 && analysis.volumeIncrease > 5 && analysis.lastClose > analysis.previousClose) {
        buyScore += INDICATOR_WEIGHTS.isBottoming;
      }
      if (analysis.gaps.gapUp && analysis.volumeIncrease > 10) buyScore += INDICATOR_WEIGHTS.gapUp;
      if (analysis.engulfingPatterns.bullish) buyScore += INDICATOR_WEIGHTS.bullishEngulfing;
      if (analysis.candleAnalysis.potentialMove === "ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration;
      if (analysis.candleAnalysis.volumePattern === "INCREASING") buyScore += INDICATOR_WEIGHTS.volumePattern;
      if (analysis.advancedPatterns.isThreeWhiteSoldiers) buyScore += INDICATOR_WEIGHTS.threeWhiteSoldiers;
  
      // Sell conditions
      if (analysis.rsiAnalysis.isOverbought) sellScore += INDICATOR_WEIGHTS.rsiOverbought;
      if (analysis.stochRsiAnalysis.isOverbought) sellScore += INDICATOR_WEIGHTS.stochRSIOverbought;
      if (parseFloat(analysis.candleAnalysis.priceAcceleration) < -0.1) sellScore += INDICATOR_WEIGHTS.priceAcceleration;
      if (analysis.gaps.gapDown && analysis.volumeIncrease > 10) sellScore += INDICATOR_WEIGHTS.gapDown;
      if (analysis.engulfingPatterns.bearish) sellScore += INDICATOR_WEIGHTS.bearishEngulfing;
      if (analysis.advancedPatterns.isThreeBlackCrows) sellScore += INDICATOR_WEIGHTS.threeBlackCrows;
  
      return { buyScore, sellScore };
    }
  
    static generateSignal(buyScore, sellScore, priceTrend) {
      const CONDITIONS_NEEDED = 5;
      if (buyScore >= CONDITIONS_NEEDED && ['BULLISH', 'SIDEWAYS'].includes(priceTrend)) {
        return "BUY";
      }
      if (sellScore >= CONDITIONS_NEEDED) {
        return "SELL";
      }
      return "HOLD";
    }
  
    static analyzeMultipleTimeframes(allIndicators, allCandles, options = {}) {
        // Helper function to parse timeframe strings
        const parseTimeframeToHours = (tf) => {
          if (!tf) return 2; // default to 2 hours
          if (typeof tf === 'number') return tf;
          if (tf.includes('h')) return parseInt(tf.replace('h', '')) || 1;
          if (tf.includes('d')) return (parseInt(tf.replace('d', '')) || 1) * 24;
          return parseInt(tf) || 1;
        };
    
        const timeframes = Object.keys(allCandles);
        const weights = options.weights || { '1h': 1, '2h': 1.5, '4h': 2, '1d': 3 };
        
        const { signals, weightedBuyScore, weightedSellScore, totalWeight } = timeframes.reduce((acc, timeframe) => {
          const candles = allCandles[timeframe];
          const indicators = allIndicators[timeframe];
          
          // Corrected timeframeWindow calculation
          const primaryHours = parseTimeframeToHours(options.primaryTimeframe);
          const currentHours = parseTimeframeToHours(timeframe);
          const timeframeWindow = Math.ceil(
            (options.analysisWindow * primaryHours) / currentHours
          );
    
          const result = this.shouldBuyOrSell(indicators, candles, timeframeWindow);
          const weight = weights[timeframe] || 1;
          
          acc.signals.push({
            timeframe,
            signal: result.signal,
            weight,
            details: result
          });
    
          acc.weightedBuyScore += result.predictiveMetrics.buyScore * weight;
          acc.weightedSellScore += result.predictiveMetrics.sellScore * weight;
          acc.totalWeight += weight;
    
          return acc;
        }, { signals: [], weightedBuyScore: 0, weightedSellScore: 0, totalWeight: 0 });
    
        const normalizedBuyScore = weightedBuyScore / totalWeight;
        const normalizedSellScore = weightedSellScore / totalWeight;
    
        return {
          consensusSignal: 
            normalizedBuyScore > 5 && normalizedBuyScore > normalizedSellScore ? "BUY" :
            normalizedSellScore > 5 && normalizedSellScore > normalizedBuyScore ? "SELL" : "HOLD",
          signals,
          normalizedBuyScore,
          normalizedSellScore,
          timeframesAnalyzed: timeframes
        };
    }
  }
  
  module.exports = MarketAnalyzer;
  */