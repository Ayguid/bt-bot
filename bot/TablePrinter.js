const { Table } = require('console-table-printer');

class TablePrinter {
    constructor() {
        this.initializeTable(); // Initialize the table
    }

    initializeTable() {
        // Create a new table instance with the desired columns
        this.table = new Table({
            columns: this.getTableColumns(),
            colorMap: { custom_green: '\x1b[32m' },
        });
    }

    print(dataArray) {
        this.initializeTable(); // Reinitialize the table for each print

        dataArray.forEach(element => {
            this.table.addRow(this.formatRowData(element), { color: this.getRowColor(element) });
        });

        this.table.printTable();
    }

    getTableColumns() {
        return [
            { name: 'pair', alignment: 'left', color: 'blue' },
            // { name: 'rsi', title: 'RSI', color: 'yellow' },
            // { name: 'stochRsi', title: 'Stoch RSI', color: 'yellow' },
            // { name: 'macd', title: 'MACD', color: 'yellow' },
            // { name: 'adx', title: 'ADX', color: 'yellow' },
            // { name: 'ao', title: 'AO', color: 'yellow' },
            // { name: 'atr', title: 'ATR', color: 'yellow' },
            { name: 'ema', title: 'EMA', color: 'custom_green' },
            { name: 'priceTrend', title: 'Price Trend' },
            { name: 'volumeTrend', title: 'Volume Trend' },
            { name: 'signal', title: 'Signal' },
            { name: 'overallPriceChange', title: 'Prc Change' },
            { name: 'tradeable', title: 'Tradeable', color: 'yellow' },
            { name: 'date', title: 'Date', alignment: 'center', color: 'blue' }
        ];
    }
    
    formatRowData(element) {
        return {
            pair: element.key,
            // rsi: element.indicators?.current_rsi.toFixed(2),
            // stochRsi: element.indicators?.current_stoch_rsi?.k?.toFixed(2),
            // macd: element.indicators?.current_macd?.histogram.toFixed(4),
            // adx: element.indicators?.current_adx?.adx.toFixed(4),
            // ao: element.indicators?.current_ao,
            // atr: element.indicators?.current_atr.toFixed(4),
            ema: element.indicators?.current_ema.toFixed(6),
            priceTrend: element.analysis?.trend.priceTrend,
            volumeTrend: element.analysis?.trend.volumeTrend,
            signal: element.analysis.signal,
            overallPriceChange: element.analysis.trend.overallPriceChange,
            tradeable: element.tradeable || '-',
            date: element.date
        };
    }
    
    getRowColor(element) {
        return element.analysis?.trend.priceTrend === 'BULLISH' || element.analysis.signal === 'BUY' ? 'green' :
               element.analysis?.trend.priceTrend === 'BEARISH' || element.analysis.signal === 'SELL' ? 'red' : '';
    }
}

module.exports = TablePrinter;
