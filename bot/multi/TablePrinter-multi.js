const { Table } = require('console-table-printer');

class TablePrinter {
    constructor() {
        this.initializeTable();
    }

    initializeTable() {
        this.table = new Table({
            columns: this.getTableColumns(),
            colorMap: {
                custom_green: '\x1b[32m',
                custom_red: '\x1b[31m',
                custom_yellow: '\x1b[33m',
                custom_blue: '\x1b[34m'
            },
        });
    }

    print(dataArray) {
        this.initializeTable();

        dataArray.forEach(element => {
            if (element && element.analysis) {
                this.table.addRow(this.formatRowData(element), { 
                    color: this.getRowColor(element) 
                });
            }
        });

        this.table.printTable();
    }

    getTableColumns() {
        return [
            { name: 'pair', title: 'Pair', alignment: 'left', color: 'custom_blue' },
            { name: 'signal', title: 'Signal', alignment: 'center' },
            { name: 'trend', title: 'Trend', alignment: 'center' },
            { name: 'priceChange', title: 'Price Chg%', alignment: 'right' },
            { name: 'volumeChange', title: 'Vol Chg%', alignment: 'right' },
            { name: 'timeframes', title: 'Timeframes', alignment: 'center' },
            { name: 'acceleration', title: 'Accel', alignment: 'right' },
            { name: 'tradeable', title: 'Trade', alignment: 'center' },
            { name: 'time', title: 'Time', alignment: 'right', color: 'custom_blue' }
        ];
    }
    
    formatRowData(element) {
        //console.log(element)
        const analysis = element.analysis || {};
        const trend = analysis.trend || {};
        const metrics = analysis.predictiveMetrics || {};
        const multiFrame = analysis.timeframesAnalyzed || [];
        
        // Get the most recent timeframe analysis for detailed metrics
        const recentAnalysis = analysis.signals?.[0]?.details || {};
        const recentMetrics = recentAnalysis.predictiveMetrics || {};
        const recentTrend = recentAnalysis.trend || {};

        return {
            pair: element.key,
            signal: analysis.consensusSignal || 'HOLD',
            trend: recentTrend.priceTrend || '-',
            priceChange: recentTrend.overallPriceChange || trend.overallPriceChange || '-',
            volumeChange: recentMetrics.volumeChange || metrics.volumeChange || '-',
            timeframes: multiFrame.join(',') || '-',
            acceleration: recentTrend.priceAcceleration || '-',
            tradeable: element.tradeable ? '✓' : '✗',
            time: element.date ? element.date.split(' ')[1] : '-'
        };
    }
    
    getRowColor(element) {
        const signal = element.analysis?.consensusSignal;
        if (signal === 'BUY') return 'custom_green';
        if (signal === 'SELL') return 'custom_red';
        if (element.tradeable) return 'custom_yellow';
        return 'white';
    }
}

module.exports = TablePrinter;
/*
 {
  signal: 'HOLD',
  trend: {
    priceTrend: 'BULLISH',
    volumeTrend: 'INCREASING',
    potentialMove: 'ACCELERATION',
    priceAcceleration: '0.175',
    avgPriceChange: '0.06%',
    avgVolumeChange: '7.02%',
    volumePattern: 'MIXED',
    overallPriceChange: '2.25%',
    summary: 'Market showing bullish trend with acceleration.'
  },
  predictiveMetrics: {
    pricePosition: '0.04',
    volumeChange: '-45.16%',
    patterns: { isThreeWhiteSoldiers: false, isThreeBlackCrows: false },
    buyScore: 0,
    sellScore: 0
  }
}
*/