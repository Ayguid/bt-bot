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
            { name: 'rsi', title: 'RSI', color: 'yellow' },
            { name: 'stochRsi', title: 'Stoch RSI', color: 'yellow' },
            { name: 'macd', title: 'MACD', color: 'yellow' },
            { name: 'adx', title: 'ADX', color: 'yellow' },
            { name: 'ao', title: 'AO', color: 'yellow' },
            { name: 'atr', title: 'ATR', color: 'yellow' },
            { name: 'ema', title: 'EMA', color: 'custom_green' },
            { name: 'priceTrend', title: 'Price Trend' },
            { name: 'volumeTrend', title: 'Volume Trend' },
            { name: 'signal', title: 'Signal' },
            { name: 'date', title: 'Date', alignment: 'center', color: 'blue' }
        ];
    }
    
    formatRowData(element) {
        return {
            pair: element.pair,
            rsi: element.indicators?.CURRENT_RSI.toFixed(2),
            stochRsi: element.indicators?.CURRENT_STOCH_RSI?.k?.toFixed(2),
            macd: element.indicators?.CURRENT_MACD?.histogram.toFixed(4),
            adx: element.indicators?.CURRENT_ADX?.adx.toFixed(4),
            ao: element.indicators?.CURRENT_AO,
            atr: element.indicators?.CURRENT_ATR.toFixed(4),
            ema: element.indicators?.CURRENT_EMA.toFixed(6),
            priceTrend: element.trend?.priceTrend,
            volumeTrend: element.trend?.volumeTrend,
            signal: element.signal,
            date: element.date
        };
    }
    
    getRowColor(element) {
        return element.trend?.priceTrend === 'Bullish' || element.signal === 'Buy' ? 'green' :
               element.trend?.priceTrend === 'Bearish' || element.signal === 'Sell' ? 'red' : '';
    }
}

module.exports = TablePrinter;
