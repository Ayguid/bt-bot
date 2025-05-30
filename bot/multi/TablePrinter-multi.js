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
            //{ name: 'potentialMoves', title: 'Pos Moves', alignment: 'right' },
            { name: 'tradeable', title: 'Trade', alignment: 'center' },
            { name: 'time', title: 'Time', alignment: 'right', color: 'custom_blue' }
        ];
    }
    
    formatRowData(element) {
        //console.log(element)
        const analysis = element.analysis || {};
        //const metrics = analysis.predictiveMetrics || {};
        const multiFrame = analysis.timeframesAnalyzed || [];
        
        // Get the most recent timeframe analysis for detailed metrics
        const recentAnalysis = analysis.signals?.[0]?.details || {}; //1hr
        const recentTrend = recentAnalysis.trend || {};

        return {
            pair: element.key,
            signal: analysis.consensusSignal || 'HOLD',
            trend: recentTrend.priceTrend || '-',
            priceChange: recentTrend.overallPriceChange || '-',
            volumeChange: recentTrend.avgVolumeChange || '-',
            timeframes: multiFrame.join(',') || '-',
            acceleration: recentTrend.priceAcceleration || '-',
            //potentialMoves: recentTrend.potentialMove + '--' +analysis.signals?.[1]?.details.trend.potentialMove|| '-',
            tradeable: element.tradeable ? '✓' : '✗',
            time: element.date ? element.date.split(' ')[1] : '-'
        };
    }
    
    getRowColor(element) {
        const signal = element.analysis?.consensusSignal;
        if (signal === 'BUY' || signal ===  'STRONG_BUY') return 'custom_green';
        if (signal === 'SELL' || signal ===  'STRONG_SELL') return 'custom_red';
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

/* 
class TablePrinter {
    constructor() {
        this.initializeTable();
    }

    initializeTable() {
        this.table = new Table({
            columns: this.getTableColumns(),
            colorMap: {
                custom_green: '\x1b[38;5;40m',  // Brighter green
                custom_red: '\x1b[38;5;196m',   // Vivid red
                custom_yellow: '\x1b[38;5;226m',// Neon yellow
                custom_blue: '\x1b[38;5;39m',   // Bright blue
                custom_gray: '\x1b[38;5;244m'   // Soft gray
            },
            style: {
                headerTop: {
                    left: '╭',
                    mid: '┬',
                    right: '╮',
                    other: '─'
                },
                headerBottom: {
                    left: '├',
                    mid: '┼',
                    right: '┤',
                    other: '─'
                },
                tableBottom: {
                    left: '╰',
                    mid: '┴',
                    right: '╯',
                    other: '─'
                },
                vertical: '│'
            }
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
            { 
                name: 'pair', 
                title: '📌 Pair', 
                alignment: 'left', 
                color: 'custom_blue',
                minLen: 10
            },
            { 
                name: 'signal', 
                title: '🚦 Signal', 
                alignment: 'center',
                minLen: 8,
                formatter: (signal) => {
                    if (signal === 'BUY') return '▲ BUY';
                    if (signal === 'SELL') return '▼ SELL';
                    return '● HOLD';
                }
            },
            { 
                name: 'trend', 
                title: '📊 Trend', 
                alignment: 'center',
                formatter: (trend) => {
                    const icons = { 
                        BULLISH: '🟢', 
                        BEARISH: '🔴', 
                        SIDEWAYS: '🟡' 
                    };
                    return `${icons[trend] || '⚪'} ${trend || '-'}`;
                }
            },
            { 
                name: 'priceChange', 
                title: '💰 Price Chg%', 
                alignment: 'right',
                formatter: (val) => val === '-' ? val : `${parseFloat(val).toFixed(2)}%`
            },
            { 
                name: 'volumeChange', 
                title: '📈 Vol Chg%', 
                alignment: 'right',
                formatter: (val) => val === '-' ? val : `${parseFloat(val).toFixed(2)}%`
            },
            { 
                name: 'timeframes', 
                title: '⏳ Timeframes', 
                alignment: 'center',
                formatter: (tf) => tf.split(',').map(t => `[${t}]`).join(' ')
            },
            { 
                name: 'acceleration', 
                title: '⚡ Accel', 
                alignment: 'right',
                formatter: (val) => val === '-' ? val : parseFloat(val).toFixed(3)
            },
            { 
                name: 'tradeable', 
                title: '🔁 Trade', 
                alignment: 'center',
                formatter: (val) => val === '✓' ? '✅' : '❌'
            },
            { 
                name: 'time', 
                title: '🕒 Time', 
                alignment: 'right',
                color: 'custom_blue',
                minLen: 8
            }
        ];
    }

    formatRowData(element) {
        const analysis = element.analysis || {};
        const trend = analysis.trend || {};
        const metrics = analysis.predictiveMetrics || {};
        const multiFrame = analysis.timeframesAnalyzed || [];

        return {
            pair: element.key,
            signal: analysis.consensusSignal || 'HOLD',
            trend: trend.priceTrend || '-',
            priceChange: this._highlightExtreme(trend.overallPriceChange || '-', 2.0),
            volumeChange: this._highlightExtreme(metrics.volumeChange || '-', 20.0),
            timeframes: multiFrame.join(','),
            acceleration: this._highlightAcceleration(trend.priceAcceleration || '-'),
            tradeable: element.tradeable ? '✓' : '✗',
            time: element.date ? element.date.split(' ')[1] : '-'
        };
    }

    _highlightExtreme(value, threshold) {
        if (value === '-') return value;
        const num = parseFloat(value);
        return Math.abs(num) > threshold ? `❗${num.toFixed(2)}%` : `${num.toFixed(2)}%`;
    }

    _highlightAcceleration(value) {
        if (value === '-') return value;
        const num = parseFloat(value);
        if (num > 0.1) return `🚀 ${num.toFixed(3)}`;
        if (num < -0.1) return `💥 ${num.toFixed(3)}`;
        return num.toFixed(3);
    }

    getRowColor(element) {
        const signal = element.analysis?.consensusSignal;
        const trend = element.analysis?.trend?.priceTrend;
        
        if (signal === 'BUY' && trend === 'BULLISH') return 'custom_green';
        if (signal === 'SELL' && trend === 'BEARISH') return 'custom_red';
        if (element.tradeable) return 'custom_yellow';
        return 'custom_gray';
    }
}

module.exports = TablePrinter;
*/