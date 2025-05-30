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

// Enhanced Early Detection Utilities
const EarlyDetectionUtils = {
    detectEarlyMomentum: (prices, volumes, currentPrice, currentVolume, lookback = 5) => {
        if (prices.length < lookback || volumes.length < lookback) return false;
        
        const priceSlice = prices.slice(-lookback);
        const volumeSlice = volumes.slice(-lookback);
        
        const avgPrice = priceSlice.reduce((sum, p) => sum + p, 0) / lookback;
        const avgVolume = volumeSlice.reduce((sum, v) => sum + v, 0) / lookback;
        
        return (currentPrice > avgPrice * 1.02) && 
            (currentVolume > avgVolume * 1.5) &&
            IndicatorUtils.isIncreasing(volumeSlice) &&
            currentPrice > Math.max(...priceSlice.slice(0, -1)); // New high of period
    },

    detectPullback: (candles) => {
        if (candles.length < 6) return false;
        
        const [prev3, prev2, prev1, current] = candles.slice(-4);
        const closes = candles.map(c => c[4]);
        
        const isUptrend = closes[closes.length-6] < closes[closes.length-5] && 
                        closes[closes.length-5] < closes[closes.length-4] && 
                        closes[closes.length-4] < closes[closes.length-3];
        
        const isPullback = prev3[4] > prev2[4] && 
                        prev2[4] > prev1[4] && 
                        current[4] > prev1[4] &&
                        (prev1[4] - current[3]) / prev1[4] < 0.02; // Rejection of lows
        
        const volumePattern = prev3[5] > prev2[5] && 
                             prev2[5] > prev1[5] && 
                             current[5] > prev1[5];
        
        return isUptrend && isPullback && volumePattern;
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
            change - pricePattern[i]);
        
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
    },

    detectEarlyTrend: (candles) => {
        if (candles.length < 8) return null;
        
        const prices = candles.map(c => c[4]);
        const volumes = candles.map(c => c[5]);
        const currentPrice = prices[prices.length-1];
        const currentVolume = volumes[volumes.length-1];
        
        const earlyMomentum = EarlyDetectionUtils.detectEarlyMomentum(
            prices, volumes, currentPrice, currentVolume
        );
        
        const goodPullback = EarlyDetectionUtils.detectPullback(candles);
        
        const roc = prices.slice(-3).map((p, i) => 
            i > 0 ? (p - prices[prices.length-4+i]) / prices[prices.length-4+i] : 0
        );
        
        const accelerating = roc[2] > roc[1] && roc[1] > 0;
        
        return {
            earlyMomentum,
            goodPullback,
            accelerating,
            rocStrength: (roc[1] + roc[2]) / 2
        };
    },

    predictPeakPotential: (candles) => {
        if (candles.length < 10) return 0;
        
        const recent = candles.slice(-5);
        const highs = recent.map(c => c[2]);
        const avgHigh = highs.reduce((sum, h) => sum + h, 0) / highs.length;
        const current = candles[candles.length - 1][4];
        
        return (avgHigh - current) / current;
    }
};

// Enhanced Volume Analysis Module
const VolumeAnalyzer = {
    analyze: (candles, windowSize) => {
        const slicedCandles = candles.slice(-windowSize);
        const recentVolumes = candles.slice(-20).map(c => IndicatorUtils.extractNumber(c[5]));
        const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
        const currentVolume = IndicatorUtils.extractNumber(candles[candles.length - 1][5]);

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
            trend,
            volumeSpike: currentVolume > avgVolume * 2
        };
    }
};

// Enhanced Pattern Detector Module
const PatternDetector = {
    detectCandlestick: (candles) => {
        if (candles.length < 3) return {};
        
        const [prev2, prev1, current] = candles.slice(-3);
        const bodySize = (candle) => Math.abs(candle[4] - candle[1]);
        const avgBodySize = (bodySize(prev2) + bodySize(prev1) + bodySize(current)) / 3;
        
        return {
            isThreeWhiteSoldiers: (
                prev2[4] > prev2[1] && 
                prev1[4] > prev1[1] && 
                current[4] > current[1] &&
                bodySize(current) > avgBodySize * 0.7
            ),
            isThreeBlackCrows: (
                prev2[4] < prev2[1] && 
                prev1[4] < prev1[1] && 
                current[4] < current[1] &&
                bodySize(current) > avgBodySize * 0.7
            )
        };
    },

    detectEngulfing: (lastCandle, previousCandle, volumeIncrease) => {
        const lastBody = Math.abs(lastCandle[4] - lastCandle[1]);
        const prevBody = Math.abs(previousCandle[4] - previousCandle[1]);
        
        return {
            bullish: (
                lastCandle[4] > lastCandle[1] &&
                previousCandle[4] < previousCandle[1] &&
                lastBody > prevBody * 1.5 &&
                lastCandle[4] > previousCandle[1] &&
                lastCandle[1] < previousCandle[4] &&
                volumeIncrease > 15
            ),
            bearish: (
                lastCandle[4] < lastCandle[1] &&
                previousCandle[4] > previousCandle[1] &&
                lastBody > prevBody * 1.5 &&
                lastCandle[4] < previousCandle[1] &&
                lastCandle[1] > previousCandle[4] &&
                volumeIncrease > 15
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
    analyzeMACD: (macdData, currentPrice = 1) => {
        if (!macdData?.histogram?.length) return {};
        
        const hist = macdData.histogram;
        const last = hist[hist.length - 1];
        const prev = hist[hist.length - 2];
        const prev2 = hist[hist.length - 3];
        const prev3 = hist[hist.length - 4];
        
        return {
            isBuilding: hist.length > 3 && 
                last > prev && 
                prev > prev2 &&
                Math.abs(last) > (0.02 * currentPrice),
            isStrongBuilding: hist.length > 5 && 
                last > prev && 
                prev > prev2 && 
                prev2 > prev3 &&
                Math.abs(last) > (0.03 * currentPrice),
            isAboveZero: last > 0,
            isBelowZero: last < 0
        };
    },

    analyzeStochRSI: (stochRsiData) => {
        if (!stochRsiData?.length) return {};
        
        const last = stochRsiData[stochRsiData.length - 1];
        const prev = stochRsiData[stochRsiData.length - 2];
        
        return {
            isTurningUp: last.k > prev.k,
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
        const prev3 = aoData[aoData.length - 4];
        
        return {
            isBuilding: aoData.length > 3 && 
                last > prev && 
                prev > prev2,
            isStrongBuilding: aoData.length > 5 && 
                last > prev && 
                prev > prev2 &&
                prev2 > prev3,
            isAboveZero: last > 0,
            isBelowZero: last < 0
        };
    },

    analyzeRSI: (rsiData, thresholds) => {
        if (!rsiData?.length) return {};
        
        const last = rsiData[rsiData.length - 1];
        const prev = rsiData[rsiData.length - 2];
        const prev2 = rsiData[rsiData.length - 3];
        
        return {
            isOversold: last < (thresholds?.RSI_OVERSOLD || 25),
            isOverbought: last > (thresholds?.RSI_OVERBOUGHT || 75),
            isRising: last > prev,
            isStrongRising: last > (prev + 2) && prev > (prev2 + 2),
            isFalling: last < prev,
            isStrongFalling: last < (prev - 2) && prev < (prev2 - 2)
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
        const earlyTrend = PriceAnalyzer.detectEarlyTrend(candles);
        const peakPotential = PriceAnalyzer.predictPeakPotential(candles);

        let priceTrend, potentialMove, confidence = "MEDIUM";
        
        if (earlyTrend?.earlyMomentum && earlyTrend.rocStrength > 0.02) {
            priceTrend = "BULLISH";
            potentialMove = "EARLY_MOMENTUM";
            confidence = peakPotential > 0.03 ? "MEDIUM" : "HIGH";
        } 
        else if (priceAnalysis.acceleration > 0.15) {
            priceTrend = "BULLISH";
            potentialMove = "STRONG_ACCELERATION";
            confidence = peakPotential > 0.02 ? "MEDIUM" : "HIGH";
        } 
        else if (priceAnalysis.acceleration > 0.1) {
            priceTrend = "BULLISH";
            potentialMove = "ACCELERATION";
            confidence = peakPotential > 0.03 ? "LOW" : "MEDIUM";
        } 
        else if (priceAnalysis.avgPriceChange > 0.2 && volumeAnalysis.trend === "STRONG_INCREASING") {
            priceTrend = "BULLISH";
            potentialMove = "STRONG_VOLUME_SUPPORT";
            confidence = peakPotential > 0.02 ? "MEDIUM" : "HIGH";
        } 
        else if (priceAnalysis.avgPriceChange > 0.2 && volumeAnalysis.isIncreasing) {
            priceTrend = "BULLISH";
            potentialMove = "VOLUME_SUPPORTED";
            confidence = peakPotential > 0.03 ? "LOW" : "MEDIUM";
        } 
        else if (priceAnalysis.avgPriceChange < -0.2 && volumeAnalysis.trend === "STRONG_DECREASING") {
            priceTrend = "BEARISH";
            potentialMove = "STRONG_REVERSAL";
            confidence = "HIGH";
        } 
        else if (priceAnalysis.avgPriceChange < -0.2) {
            priceTrend = "BEARISH";
            potentialMove = "REVERSAL_POSSIBLE";
        } 
        else {
            priceTrend = "SIDEWAYS";
            potentialMove = "CONSOLIDATION";
            confidence = "LOW";
        }

        return {
            priceTrend,
            volumeTrend: volumeAnalysis.trend,
            potentialMove,
            confidence,
            earlyTrend,
            priceAcceleration: priceAnalysis.acceleration,
            avgPriceChange: priceAnalysis.avgPriceChange,
            avgVolumeChange: volumeAnalysis.avgChange,
            volumePattern: volumeAnalysis.isIncreasing ? "INCREASING" : "MIXED",
            overallPriceChange,
            peakPotential,
            summary: `${priceTrend} market (${confidence} confidence) with ${potentialMove.replace('_', ' ').toLowerCase()}`
        };
    }

    static shouldBuyOrSell(indicators, candles, analysisWindow = candles.length) {
        if (candles.length < 2) {
            return {
                signal: "Insufficient data",
                trend: null,
                predictiveMetrics: {
                    buyScore: 0,
                    sellScore: 0,
                    pricePosition: 0,
                    volumeChange: "0%",
                    patterns: {}
                }
            };
        }

        const candleAnalysis = this.analyzeCandles(candles, analysisWindow);
        const lastCandle = candles[candles.length - 1];
        const previousCandle = candles[candles.length - 2];
        const currentPrice = IndicatorUtils.extractNumber(lastCandle[4]);

        const lastClose = currentPrice;
        const previousClose = IndicatorUtils.extractNumber(previousCandle[4]);
        const priceRange = IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3]);
        const closePosition = priceRange > 0 ? 
            (lastClose - IndicatorUtils.extractNumber(lastCandle[3])) / priceRange : 0;
        const volumeIncrease = IndicatorUtils.calculatePercentageChange(
            IndicatorUtils.extractNumber(lastCandle[5]),
            IndicatorUtils.extractNumber(previousCandle[5])
        );

        const advancedPatterns = PatternDetector.detectCandlestick(candles);
        const engulfingPatterns = PatternDetector.detectEngulfing(lastCandle, previousCandle, volumeIncrease);
        const gaps = PatternDetector.detectGaps(lastCandle, previousCandle);

        const volatility = (IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3])) / 
            IndicatorUtils.extractNumber(lastCandle[1]);
        const thresholds = { 
            RSI_OVERBOUGHT: volatility > 0.02 ? 78 : 75, 
            RSI_OVERSOLD: volatility > 0.02 ? 22 : 25 
        };

        const macdAnalysis = IndicatorAnalyzer.analyzeMACD(indicators.macd, currentPrice);
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
            previousClose,
            currentPrice,
            candles
        });

        const signal = this.generateSignal(buyScore, sellScore, candleAnalysis.priceTrend, candleAnalysis.earlyTrend);

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
                    isBottoming: closePosition < 0.3 && volumeIncrease > 10 && lastClose > previousClose,
                    isPreBreakout: closePosition > 0.7 && volumeIncrease > 15
                },
                buyScore,
                sellScore
            }
        };
    }

    static calculateScores(analysis) {
        const INDICATOR_WEIGHTS = {
            // Buy conditions
            macdBuilding: 1.5,
            macdStrongBuilding: 2.0,
            stochRSITurning: 1.2,
            stochRSIBullishDivergence: 2.5,
            rsiOversold: 1.8,
            rsiRising: 1.2,
            rsiStrongRising: 1.5,
            aoBuilding: 1.8,
            aoStrongBuilding: 2.2,
            aoAboveZero: 1.3,
            isPreBreakout: 2.0,
            isBottoming: 1.8,
            gapUp: 1.3,
            bullishEngulfing: 1.5,
            priceAcceleration: 2.0,
            volumePattern: 1.3,
            volumeSpike: 1.5,
            threeWhiteSoldiers: 2.0,
            earlyMomentum: 3.0,
            goodPullback: 2.5,
            acceleratingRoc: 2.0,
            multiTimeframeConfirm: 2.5,
            
            // Sell conditions
            rsiOverbought: 2.0,
            rsiFalling: 1.2,
            rsiStrongFalling: 1.5,
            stochRSIOverbought: 2.2,
            aoBelowZero: 1.5,
            priceDeceleration: 2.0,
            gapDown: 1.5,
            bearishEngulfing: 1.8,
            threeBlackCrows: 2.5
        };

        let buyScore = 0;
        let sellScore = 0;

        // Early detection conditions
        if (analysis.candleAnalysis?.earlyTrend?.earlyMomentum) {
            buyScore += INDICATOR_WEIGHTS.earlyMomentum;
            if (analysis.volumeIncrease > 25) {
                buyScore += INDICATOR_WEIGHTS.earlyMomentum * 0.5;
            }
        }
        
        if (analysis.candleAnalysis?.earlyTrend?.goodPullback) {
            buyScore += INDICATOR_WEIGHTS.goodPullback;
        }
        
        if (analysis.candleAnalysis?.earlyTrend?.accelerating) {
            buyScore += INDICATOR_WEIGHTS.acceleratingRoc;
            if (analysis.candleAnalysis.earlyTrend.rocStrength > 0.015) {
                buyScore += INDICATOR_WEIGHTS.acceleratingRoc * 0.5;
            }
        }

        // Standard buy conditions
        if (analysis.macdAnalysis?.isBuilding) buyScore += INDICATOR_WEIGHTS.macdBuilding;
        if (analysis.macdAnalysis?.isStrongBuilding) buyScore += INDICATOR_WEIGHTS.macdStrongBuilding;
        if (analysis.stochRsiAnalysis?.isTurningUp) buyScore += INDICATOR_WEIGHTS.stochRSITurning;
        if (analysis.stochRsiAnalysis?.bullishDivergence) buyScore += INDICATOR_WEIGHTS.stochRSIBullishDivergence;
        if (analysis.rsiAnalysis?.isOversold) buyScore += INDICATOR_WEIGHTS.rsiOversold;
        if (analysis.rsiAnalysis?.isRising) buyScore += INDICATOR_WEIGHTS.rsiRising;
        if (analysis.rsiAnalysis?.isStrongRising) buyScore += INDICATOR_WEIGHTS.rsiStrongRising;
        if (analysis.aoAnalysis?.isBuilding) buyScore += INDICATOR_WEIGHTS.aoBuilding;
        if (analysis.aoAnalysis?.isStrongBuilding) buyScore += INDICATOR_WEIGHTS.aoStrongBuilding;
        if (analysis.aoAnalysis?.isAboveZero) buyScore += INDICATOR_WEIGHTS.aoAboveZero;
        if (analysis.closePosition > 0.7 && analysis.volumeIncrease > 15) buyScore += INDICATOR_WEIGHTS.isPreBreakout;
        if (analysis.closePosition < 0.3 && analysis.volumeIncrease > 15 && analysis.lastClose > analysis.previousClose) {
            buyScore += INDICATOR_WEIGHTS.isBottoming;
        }
        if (analysis.gaps?.gapUp && analysis.volumeIncrease > 20) buyScore += INDICATOR_WEIGHTS.gapUp;
        if (analysis.engulfingPatterns?.bullish) buyScore += INDICATOR_WEIGHTS.bullishEngulfing;
        if (analysis.candleAnalysis?.potentialMove === "STRONG_ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration * 1.5;
        else if (analysis.candleAnalysis?.potentialMove === "ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration;
        if (analysis.candleAnalysis?.volumePattern === "INCREASING") buyScore += INDICATOR_WEIGHTS.volumePattern;
        if (analysis.volumeAnalysis?.volumeSpike) buyScore += INDICATOR_WEIGHTS.volumeSpike;
        if (analysis.advancedPatterns?.isThreeWhiteSoldiers) buyScore += INDICATOR_WEIGHTS.threeWhiteSoldiers;

        // Sell conditions
        if (analysis.rsiAnalysis?.isOverbought) sellScore += INDICATOR_WEIGHTS.rsiOverbought;
        if (analysis.rsiAnalysis?.isFalling) sellScore += INDICATOR_WEIGHTS.rsiFalling;
        if (analysis.rsiAnalysis?.isStrongFalling) sellScore += INDICATOR_WEIGHTS.rsiStrongFalling;
        if (analysis.stochRsiAnalysis?.isOverbought) sellScore += INDICATOR_WEIGHTS.stochRSIOverbought;
        if (analysis.aoAnalysis?.isBelowZero) sellScore += INDICATOR_WEIGHTS.aoBelowZero;
        if (parseFloat(analysis.candleAnalysis?.priceAcceleration || 0) < -0.15) sellScore += INDICATOR_WEIGHTS.priceDeceleration;
        if (analysis.gaps?.gapDown) sellScore += INDICATOR_WEIGHTS.gapDown;
        if (analysis.engulfingPatterns?.bearish) sellScore += INDICATOR_WEIGHTS.bearishEngulfing;
        if (analysis.advancedPatterns?.isThreeBlackCrows) sellScore += INDICATOR_WEIGHTS.threeBlackCrows;

        // Trend-based adjustments
        if (analysis.candleAnalysis?.priceTrend === "BULLISH") {
            buyScore *= 1.1;
            sellScore *= 0.9;
        } else if (analysis.candleAnalysis?.priceTrend === "BEARISH") {
            buyScore *= 0.9;
            sellScore *= 1.1;
        }

        return { 
            buyScore: Math.round(buyScore * 10) / 10, 
            sellScore: Math.round(sellScore * 10) / 10 
        };
    }

    static generateSignal(buyScore, sellScore, priceTrend, earlyTrend) {
        const EARLY_DETECTION_THRESHOLDS = {
            BULLISH: { buy: 4, strongBuy: 7 },
            BEARISH: { buy: 5, strongBuy: 8 },
            SIDEWAYS: { buy: 6, strongBuy: 9 }
        };
        
        const STANDARD_THRESHOLDS = {
            BULLISH: { buy: 6, strongBuy: 10 },
            BEARISH: { buy: 7, strongBuy: 11 },
            SIDEWAYS: { buy: 8, strongBuy: 12 }
        };
        
        // Early detection gets priority if conditions are met
        if (earlyTrend?.earlyMomentum || earlyTrend?.goodPullback) {
            const thresholds = EARLY_DETECTION_THRESHOLDS[priceTrend];
            
            if (buyScore >= thresholds.strongBuy && sellScore < 3) {
                return "EARLY_STRONG_BUY";
            }
            if (buyScore >= thresholds.buy && sellScore < 2) {
                return "EARLY_BUY";
            }
        }
        
        // Standard signal generation
        const thresholds = STANDARD_THRESHOLDS[priceTrend];
        
        if (buyScore >= thresholds.strongBuy && sellScore < 4) {
            return "STRONG_BUY";
        }
        if (buyScore >= thresholds.buy && sellScore < 3) {
            return "BUY";
        }
        if (sellScore >= thresholds.strongBuy && buyScore < 4) {
            return "STRONG_SELL";
        }
        if (sellScore >= thresholds.buy && buyScore < 3) {
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
        const minAgreement = options.minAgreement || Math.max(2, Math.floor(timeframes.length * 0.6));
        
        const { signals, weightedBuyScore, weightedSellScore, totalWeight } = timeframes.reduce((acc, timeframe) => {
            const candles = allCandles[timeframe];
            const indicators = allIndicators[timeframe];
            
            const primaryHours = parseTimeframeToHours(options.primaryTimeframe);
            const currentHours = parseTimeframeToHours(timeframe);
            const timeframeWindow = Math.max(
                5,
                Math.ceil((options.analysisWindow * primaryHours) / currentHours)
            );
    
            const result = this.shouldBuyOrSell(indicators, candles, timeframeWindow);
            const weight = weights[timeframe] || 1;
            
            const metrics = result.predictiveMetrics || {
                buyScore: 0,
                sellScore: 0,
                volumeChange: "0%"
            };
            
            acc.signals.push({
                timeframe,
                signal: result.signal,
                weight,
                details: result
            });
    
            const signalMultiplier = result.signal.includes('STRONG_') ? 1.5 : 
                                  result.signal.includes('EARLY_') ? 1.3 : 1;
            const volumeConfirmed = parseFloat(metrics.volumeChange) > 15;
            const volumeMultiplier = volumeConfirmed ? 1.3 : 1;
            
            acc.weightedBuyScore += (metrics.buyScore || 0) * weight * signalMultiplier * volumeMultiplier;
            acc.weightedSellScore += (metrics.sellScore || 0) * weight * signalMultiplier;
            acc.totalWeight += weight;
    
            return acc;
        }, { signals: [], weightedBuyScore: 0, weightedSellScore: 0, totalWeight: 0 });
    
        const normalizedBuyScore = totalWeight > 0 ? weightedBuyScore / totalWeight : 0;
        const normalizedSellScore = totalWeight > 0 ? weightedSellScore / totalWeight : 0;
        
        const buySignals = signals.filter(s => s.signal.includes('BUY')).length;
        const sellSignals = signals.filter(s => s.signal.includes('SELL')).length;
        
        // Early signals get priority if they meet agreement threshold
        const earlyBuySignals = signals.filter(s => s.signal.includes('EARLY_BUY')).length;
        if (earlyBuySignals >= Math.max(1, minAgreement - 1) && normalizedBuyScore > 7) {
            return {
                consensusSignal: "EARLY_BUY",
                signals,
                normalizedBuyScore,
                normalizedSellScore,
                timeframesAnalyzed: timeframes,
                agreement: {
                    buy: buySignals,
                    sell: sellSignals,
                    required: minAgreement
                }
            };
        }
        
        return {
            consensusSignal: 
                normalizedBuyScore > 8 && buySignals >= minAgreement ? "STRONG_BUY" :
                normalizedBuyScore > 6 && buySignals >= minAgreement ? "BUY" :
                normalizedSellScore > 8 && sellSignals >= minAgreement ? "STRONG_SELL" :
                normalizedSellScore > 6 && sellSignals >= minAgreement ? "SELL" : "HOLD",
            signals,
            normalizedBuyScore,
            normalizedSellScore,
            timeframesAnalyzed: timeframes,
            agreement: {
                buy: buySignals,
                sell: sellSignals,
                required: minAgreement
            }
        };
    }
}

module.exports = MarketAnalyzer;

/* //
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
        const recentVolumes = candles.slice(-20).map(c => IndicatorUtils.extractNumber(c[5]));
        const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
        const currentVolume = IndicatorUtils.extractNumber(candles[candles.length - 1][5]);

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
            trend,
            volumeSpike: currentVolume > avgVolume * 2
        };
    }
};

// Enhanced Pattern Detector Module
const PatternDetector = {
    detectCandlestick: (candles) => {
        if (candles.length < 3) return {};
        
        const [prev2, prev1, current] = candles.slice(-3);
        const bodySize = (candle) => Math.abs(candle[4] - candle[1]);
        const avgBodySize = (bodySize(prev2) + bodySize(prev1) + bodySize(current)) / 3;
        
        return {
            isThreeWhiteSoldiers: (
                prev2[4] > prev2[1] && 
                prev1[4] > prev1[1] && 
                current[4] > current[1] &&
                bodySize(current) > avgBodySize * 0.7
            ),
            isThreeBlackCrows: (
                prev2[4] < prev2[1] && 
                prev1[4] < prev1[1] && 
                current[4] < current[1] &&
                bodySize(current) > avgBodySize * 0.7
            )
        };
    },

    detectEngulfing: (lastCandle, previousCandle, volumeIncrease) => {
        const lastBody = Math.abs(lastCandle[4] - lastCandle[1]);
        const prevBody = Math.abs(previousCandle[4] - previousCandle[1]);
        
        return {
            bullish: (
                lastCandle[4] > lastCandle[1] &&
                previousCandle[4] < previousCandle[1] &&
                lastBody > prevBody * 1.5 &&
                lastCandle[4] > previousCandle[1] &&
                lastCandle[1] < previousCandle[4] &&
                volumeIncrease > 15
            ),
            bearish: (
                lastCandle[4] < lastCandle[1] &&
                previousCandle[4] > previousCandle[1] &&
                lastBody > prevBody * 1.5 &&
                lastCandle[4] < previousCandle[1] &&
                lastCandle[1] > previousCandle[4] &&
                volumeIncrease > 15
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
    analyzeMACD: (macdData, currentPrice = 1) => {
        if (!macdData?.histogram?.length) return {};
        
        const hist = macdData.histogram;
        const last = hist[hist.length - 1];
        const prev = hist[hist.length - 2];
        const prev2 = hist[hist.length - 3];
        const prev3 = hist[hist.length - 4];
        
        return {
            isBuilding: hist.length > 3 && 
                last > prev && 
                prev > prev2 &&
                Math.abs(last) > (0.02 * currentPrice),
            isStrongBuilding: hist.length > 5 && 
                last > prev && 
                prev > prev2 && 
                prev2 > prev3 &&
                Math.abs(last) > (0.03 * currentPrice),
            isAboveZero: last > 0,
            isBelowZero: last < 0
        };
    },

    analyzeStochRSI: (stochRsiData) => {
        if (!stochRsiData?.length) return {};
        
        const last = stochRsiData[stochRsiData.length - 1];
        const prev = stochRsiData[stochRsiData.length - 2];
        
        return {
            isTurningUp: last.k > prev.k,
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
        const prev3 = aoData[aoData.length - 4];
        
        return {
            isBuilding: aoData.length > 3 && 
                last > prev && 
                prev > prev2,
            isStrongBuilding: aoData.length > 5 && 
                last > prev && 
                prev > prev2 &&
                prev2 > prev3,
            isAboveZero: last > 0,
            isBelowZero: last < 0
        };
    },

    analyzeRSI: (rsiData, thresholds) => {
        if (!rsiData?.length) return {};
        
        const last = rsiData[rsiData.length - 1];
        const prev = rsiData[rsiData.length - 2];
        const prev2 = rsiData[rsiData.length - 3];
        
        return {
            isOversold: last < (thresholds?.RSI_OVERSOLD || 25),
            isOverbought: last > (thresholds?.RSI_OVERBOUGHT || 75),
            isRising: last > prev,
            isStrongRising: last > (prev + 2) && prev > (prev2 + 2),
            isFalling: last < prev,
            isStrongFalling: last < (prev - 2) && prev < (prev2 - 2)
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
                predictiveMetrics: {
                    buyScore: 0,
                    sellScore: 0,
                    pricePosition: 0,
                    volumeChange: "0%",
                    patterns: {}
                }
            };
        }

        const candleAnalysis = this.analyzeCandles(candles, analysisWindow);
        const lastCandle = candles[candles.length - 1];
        const previousCandle = candles[candles.length - 2];
        const currentPrice = IndicatorUtils.extractNumber(lastCandle[4]);

        const lastClose = currentPrice;
        const previousClose = IndicatorUtils.extractNumber(previousCandle[4]);
        const priceRange = IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3]);
        const closePosition = priceRange > 0 ? 
            (lastClose - IndicatorUtils.extractNumber(lastCandle[3])) / priceRange : 0;
        const volumeIncrease = IndicatorUtils.calculatePercentageChange(
            IndicatorUtils.extractNumber(lastCandle[5]),
            IndicatorUtils.extractNumber(previousCandle[5])
        );

        const advancedPatterns = PatternDetector.detectCandlestick(candles);
        const engulfingPatterns = PatternDetector.detectEngulfing(lastCandle, previousCandle, volumeIncrease);
        const gaps = PatternDetector.detectGaps(lastCandle, previousCandle);

        const volatility = (IndicatorUtils.extractNumber(lastCandle[2]) - IndicatorUtils.extractNumber(lastCandle[3])) / 
            IndicatorUtils.extractNumber(lastCandle[1]);
        const thresholds = { 
            RSI_OVERBOUGHT: volatility > 0.02 ? 78 : 75, 
            RSI_OVERSOLD: volatility > 0.02 ? 22 : 25 
        };

        const macdAnalysis = IndicatorAnalyzer.analyzeMACD(indicators.macd, currentPrice);
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
            previousClose,
            currentPrice,
            candles
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
                    isBottoming: closePosition < 0.3 && volumeIncrease > 10 && lastClose > previousClose,
                    isPreBreakout: closePosition > 0.7 && volumeIncrease > 15
                },
                buyScore,
                sellScore
            }
        };
    }

    static calculateScores(analysis) {
        const INDICATOR_WEIGHTS = {
            // Buy conditions
            macdBuilding: 1.5,
            macdStrongBuilding: 2.0,
            stochRSITurning: 1.2,
            stochRSIBullishDivergence: 2.5,
            rsiOversold: 1.8,
            rsiRising: 1.2,
            rsiStrongRising: 1.5,
            aoBuilding: 1.8,
            aoStrongBuilding: 2.2,
            aoAboveZero: 1.3,
            isPreBreakout: 2.0,
            isBottoming: 1.8,
            gapUp: 1.3,
            bullishEngulfing: 1.5,
            priceAcceleration: 2.0,
            volumePattern: 1.3,
            volumeSpike: 1.5,
            threeWhiteSoldiers: 2.0,
            
            // Sell conditions
            rsiOverbought: 2.0,
            rsiFalling: 1.2,
            rsiStrongFalling: 1.5,
            stochRSIOverbought: 2.2,
            aoBelowZero: 1.5,
            priceDeceleration: 2.0,
            gapDown: 1.5,
            bearishEngulfing: 1.8,
            threeBlackCrows: 2.5
        };

        let buyScore = 0;
        let sellScore = 0;

        // Buy conditions
        if (analysis.macdAnalysis?.isBuilding) buyScore += INDICATOR_WEIGHTS.macdBuilding;
        if (analysis.macdAnalysis?.isStrongBuilding) buyScore += INDICATOR_WEIGHTS.macdStrongBuilding;
        if (analysis.stochRsiAnalysis?.isTurningUp) buyScore += INDICATOR_WEIGHTS.stochRSITurning;
        if (analysis.stochRsiAnalysis?.bullishDivergence) buyScore += INDICATOR_WEIGHTS.stochRSIBullishDivergence;
        if (analysis.rsiAnalysis?.isOversold) buyScore += INDICATOR_WEIGHTS.rsiOversold;
        if (analysis.rsiAnalysis?.isRising) buyScore += INDICATOR_WEIGHTS.rsiRising;
        if (analysis.rsiAnalysis?.isStrongRising) buyScore += INDICATOR_WEIGHTS.rsiStrongRising;
        if (analysis.aoAnalysis?.isBuilding) buyScore += INDICATOR_WEIGHTS.aoBuilding;
        if (analysis.aoAnalysis?.isStrongBuilding) buyScore += INDICATOR_WEIGHTS.aoStrongBuilding;
        if (analysis.aoAnalysis?.isAboveZero) buyScore += INDICATOR_WEIGHTS.aoAboveZero;
        if (analysis.closePosition > 0.7 && analysis.volumeIncrease > 15) buyScore += INDICATOR_WEIGHTS.isPreBreakout;
        if (analysis.closePosition < 0.3 && analysis.volumeIncrease > 15 && analysis.lastClose > analysis.previousClose) {
            buyScore += INDICATOR_WEIGHTS.isBottoming;
        }
        if (analysis.gaps?.gapUp && analysis.volumeIncrease > 20) buyScore += INDICATOR_WEIGHTS.gapUp;
        if (analysis.engulfingPatterns?.bullish) buyScore += INDICATOR_WEIGHTS.bullishEngulfing;
        if (analysis.candleAnalysis?.potentialMove === "STRONG_ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration * 1.5;
        else if (analysis.candleAnalysis?.potentialMove === "ACCELERATION") buyScore += INDICATOR_WEIGHTS.priceAcceleration;
        if (analysis.candleAnalysis?.volumePattern === "INCREASING") buyScore += INDICATOR_WEIGHTS.volumePattern;
        if (analysis.volumeAnalysis?.volumeSpike) buyScore += INDICATOR_WEIGHTS.volumeSpike;
        if (analysis.advancedPatterns?.isThreeWhiteSoldiers) buyScore += INDICATOR_WEIGHTS.threeWhiteSoldiers;

        // Sell conditions
        if (analysis.rsiAnalysis?.isOverbought) sellScore += INDICATOR_WEIGHTS.rsiOverbought;
        if (analysis.rsiAnalysis?.isFalling) sellScore += INDICATOR_WEIGHTS.rsiFalling;
        if (analysis.rsiAnalysis?.isStrongFalling) sellScore += INDICATOR_WEIGHTS.rsiStrongFalling;
        if (analysis.stochRsiAnalysis?.isOverbought) sellScore += INDICATOR_WEIGHTS.stochRSIOverbought;
        if (analysis.aoAnalysis?.isBelowZero) sellScore += INDICATOR_WEIGHTS.aoBelowZero;
        if (parseFloat(analysis.candleAnalysis?.priceAcceleration || 0) < -0.15) sellScore += INDICATOR_WEIGHTS.priceDeceleration;
        if (analysis.gaps?.gapDown) sellScore += INDICATOR_WEIGHTS.gapDown;
        if (analysis.engulfingPatterns?.bearish) sellScore += INDICATOR_WEIGHTS.bearishEngulfing;
        if (analysis.advancedPatterns?.isThreeBlackCrows) sellScore += INDICATOR_WEIGHTS.threeBlackCrows;

        // Trend-based adjustments
        if (analysis.candleAnalysis?.priceTrend === "BULLISH") {
            buyScore *= 1.2;
            sellScore *= 0.8;
        } else if (analysis.candleAnalysis?.priceTrend === "BEARISH") {
            buyScore *= 0.8;
            sellScore *= 1.2;
        }

        return { 
            buyScore: Math.round(buyScore * 10) / 10, 
            sellScore: Math.round(sellScore * 10) / 10 
        };
    }

    static generateSignal(buyScore, sellScore, priceTrend) {
        const TREND_ADJUSTMENT = {
            BULLISH: { buy: 0.8, sell: 1.2 },
            BEARISH: { buy: 1.2, sell: 0.8 },
            SIDEWAYS: { buy: 1.0, sell: 1.0 }
        };
        
        const adj = TREND_ADJUSTMENT[priceTrend];
        const BUY_THRESHOLD = 5 * adj.buy;
        const STRONG_BUY_THRESHOLD = 8 * adj.buy;
        const SELL_THRESHOLD = 5 * adj.sell;
        const STRONG_SELL_THRESHOLD = 8 * adj.sell;

        if (buyScore >= STRONG_BUY_THRESHOLD) return "STRONG_BUY";
        if (buyScore >= BUY_THRESHOLD) return "BUY";
        if (sellScore >= STRONG_SELL_THRESHOLD) return "STRONG_SELL";
        if (sellScore >= SELL_THRESHOLD) return "SELL";
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
        const minAgreement = options.minAgreement || Math.max(2, Math.floor(timeframes.length * 0.6));
        
        const { signals, weightedBuyScore, weightedSellScore, totalWeight } = timeframes.reduce((acc, timeframe) => {
            const candles = allCandles[timeframe];
            const indicators = allIndicators[timeframe];
            
            const primaryHours = parseTimeframeToHours(options.primaryTimeframe);
            const currentHours = parseTimeframeToHours(timeframe);
            const timeframeWindow = Math.max(
                5, // minimum window
                Math.ceil((options.analysisWindow * primaryHours) / currentHours)
            );
    
            const result = this.shouldBuyOrSell(indicators, candles, timeframeWindow);
            const weight = weights[timeframe] || 1;
            
            const metrics = result.predictiveMetrics || {
                buyScore: 0,
                sellScore: 0,
                volumeChange: "0%"
            };
            
            acc.signals.push({
                timeframe,
                signal: result.signal,
                weight,
                details: result
            });
    
            const signalMultiplier = result.signal.includes('STRONG_') ? 1.5 : 1;
            const volumeConfirmed = parseFloat(metrics.volumeChange) > 15;
            const volumeMultiplier = volumeConfirmed ? 1.3 : 1;
            
            acc.weightedBuyScore += (metrics.buyScore || 0) * weight * signalMultiplier * volumeMultiplier;
            acc.weightedSellScore += (metrics.sellScore || 0) * weight * signalMultiplier;
            acc.totalWeight += weight;
    
            return acc;
        }, { signals: [], weightedBuyScore: 0, weightedSellScore: 0, totalWeight: 0 });
    
        const normalizedBuyScore = totalWeight > 0 ? weightedBuyScore / totalWeight : 0;
        const normalizedSellScore = totalWeight > 0 ? weightedSellScore / totalWeight : 0;
        
        const buySignals = signals.filter(s => s.signal.includes('BUY')).length;
        const sellSignals = signals.filter(s => s.signal.includes('SELL')).length;
        
        return {
            consensusSignal: 
                normalizedBuyScore > 8 && buySignals >= minAgreement ? "STRONG_BUY" :
                normalizedBuyScore > 6 && buySignals >= minAgreement ? "BUY" :
                normalizedSellScore > 8 && sellSignals >= minAgreement ? "STRONG_SELL" :
                normalizedSellScore > 6 && sellSignals >= minAgreement ? "SELL" : "HOLD",
            signals,
            normalizedBuyScore,
            normalizedSellScore,
            timeframesAnalyzed: timeframes,
            agreement: {
                buy: buySignals,
                sell: sellSignals,
                required: minAgreement
            }
        };
    }
}

module.exports = MarketAnalyzer;
 */