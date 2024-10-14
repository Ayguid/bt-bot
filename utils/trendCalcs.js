const analyzeCandles = (candles, analysisWindow = candles.length) => {
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
    if (index === 0) return 0;
    const prevClose = extractNumber(candlesToAnalyze[index - 1][4]);  // Previous Close (index 4)
    const currentClose = extractNumber(candle[4]);                     // Current Close (index 4)
    return prevClose === 0 ? 0 : ((currentClose - prevClose) / prevClose) * 100;
  }).slice(1);

  const volumeChanges = candlesToAnalyze.map((candle, index) => {
    if (index === 0) return 0;
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


module.exports = { analyzeCandles };
/*
const analyzeVolumeTrend = (volumes) => {
    if (volumes.length < 2) {
      return {
        trend: "Insufficient data",
        description: "Not enough data to determine trend",
        details: {}
      };
    }
  
    const changes = volumes.slice(1).map((vol, i) => {
      const change = (vol - volumes[i]) / volumes[i];
      return {
        fromVolume: volumes[i],
        toVolume: vol,
        change: change,
        percentChange: change * 100
      };
    });
  
    const trendSum = changes.reduce((sum, change) => sum + Math.sign(change.change), 0);
    const averageChange = changes.reduce((sum, change) => sum + change.change, 0) / changes.length;
    const totalChange = (volumes[volumes.length - 1] - volumes[0]) / volumes[0];
  
    let trend, description;
    if (trendSum > 0) {
      trend = "Pos";
      description = "Volume is generally increasing";
    } else if (trendSum < 0) {
      trend = "Negative";
      description = "Volume is generally decreasing";
    } else {
      trend = "Neutral";
      description = "No clear trend in volume";
    }
  
    const volatility = Math.sqrt(changes.reduce((sum, change) => sum + Math.pow(change.change, 2), 0) / changes.length);
  
    return {
      trend,
      description,
      averageChange: parseFloat((averageChange * 100).toFixed(2)),
      totalChange: parseFloat((totalChange * 100).toFixed(2)),
      volatility: parseFloat((volatility * 100).toFixed(2)),
      details: {
        numberOfDataPoints: volumes.length,
        firstVolume: volumes[0],
        lastVolume: volumes[volumes.length - 1],
        maxVolume: Math.max(...volumes),
        minVolume: Math.min(...volumes),
        trendSum,
        significantChanges: changes.filter(c => Math.abs(c.percentChange) > 10).map(c => ({
          from: c.fromVolume,
          to: c.toVolume,
          percentChange: parseFloat(c.percentChange.toFixed(2))
        }))
      }
    };
  };



  
const analyze24HourVolumeTrend = (candles) => {
    // Extract volumes from the last 12 candles (24 hours of 2-hour candles)
    const relevantCandles = candles.slice(-12);
    const volumes = relevantCandles.map(candle => parseFloat(candle[5]));
  
    if (volumes.length < 12) {
      return {
        trend: "Insufficient data",
        description: "Need at least 12 data points for 24-hour analysis"
      };
    }
  
    // Calculate the simple moving average for the first and second half of the data
    const firstHalfAvg = volumes.slice(0, 6).reduce((sum, vol) => sum + vol, 0) / 6;
    const secondHalfAvg = volumes.slice(-6).reduce((sum, vol) => sum + vol, 0) / 6;
  
    // Determine the trend based on the comparison of these averages
    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
  
    let trend, description;
    if (percentChange > 5) {
      trend = "Upward";
      description = "Volume is trending upward over the last 24 hours";
    } else if (percentChange < -5) {
      trend = "Downward";
      description = "Volume is trending downward over the last 24 hours";
    } else {
      trend = "Neutral";
      description = "No significant volume trend over the last 24 hours";
    }
  
    return {
      trend,
      description,
      percentChange: parseFloat(percentChange.toFixed(2))
    };
  };
  */