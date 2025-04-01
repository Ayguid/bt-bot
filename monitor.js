const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

// Dynamic imports for ESM packages
let chalk, table, moment;

const config = {
    ROOT_DB_DIR: './db',
    DEFAULT_FILE: 'final_data.json',
    REFRESH_INTERVAL: 3000,
    MAX_ORDERS_TO_SHOW: 10,
    PRICE_DECIMALS: 4,
    AMOUNT_DECIMALS: 6
};

// State management
let currentDateDir = '';
let currentData = {};
let availableDates = [];
let selectedPairIndex = 0;

async function loadDependencies() {
    chalk = (await import('chalk')).default;
    table = (await import('table')).table;
    moment = (await import('moment')).default;
}

function formatPrice(price) {
    if (price === undefined || price === null) return 'N/A';
    const num = parseFloat(price);
    return isNaN(num) ? 'N/A' : num.toFixed(config.PRICE_DECIMALS);
}

function formatAmount(amount) {
    if (amount === undefined || amount === null) return 'N/A';
    const num = parseFloat(amount);
    return isNaN(num) ? 'N/A' : num.toFixed(config.AMOUNT_DECIMALS);
}

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function renderHeader() {
    console.log(chalk.blue.bold('=== Trading Bot Monitor ==='));
    console.log(chalk.gray(`Current Date: ${chalk.yellow(currentDateDir)}`));
    console.log(chalk.gray(`Current Pair: ${chalk.yellow(Object.keys(currentData)[selectedPairIndex] || 'None')}`));
    console.log(chalk.gray(`Last update: ${moment().format('HH:mm:ss')}\n`));
    
    console.log(chalk.yellow.bold('Available Dates:'));
    availableDates.forEach((date, index) => {
        console.log(`[${index}] ${date} ${date === currentDateDir ? chalk.green('← Current') : ''}`);
    });
    
    console.log('\nControls:');
    console.log('Number - Switch to date');
    console.log('n - Next pair');
    console.log('p - Previous pair');
    console.log('0-9 - Select pair by index');
    console.log('q - Quit\n');
}

function displayOrderDetails(orders) {
    if (!orders || !orders.length) return 'No orders found';
    
    // Sort orders by time (newest first)
    const sortedOrders = [...orders].sort((a, b) => b.time - a.time);
    
    // Get the most recent orders
    const recentOrders = sortedOrders.slice(0, config.MAX_ORDERS_TO_SHOW);
    
    return table([
        [
            chalk.bold('Time'), 
            chalk.bold('Side'), 
            chalk.bold('Status'), 
            chalk.bold('Price'), 
            chalk.bold('Amount'),
            chalk.bold('Filled')
        ],
        ...recentOrders.map(order => {
            const filledPercent = order.origQty > 0 
                ? (parseFloat(order.executedQty) / parseFloat(order.origQty)) * 100 
                : 0;
            
            return [
                moment(order.time).format('HH:mm:ss'),
                order.side === 'BUY' ? chalk.green('BUY') : chalk.red('SELL'),
                order.status === 'FILLED' ? chalk.green(order.status) : 
                order.status === 'CANCELED' ? chalk.yellow(order.status) : 
                order.status === 'PARTIALLY_FILLED' ? chalk.blue(order.status) : order.status,
                formatPrice(order.price),
                formatAmount(order.origQty),
                `${filledPercent.toFixed(2)}%`
            ];
        })
    ]);
}

function renderData() {
    clearScreen();
    renderHeader();
    
    const pairs = Object.keys(currentData);
    if (!pairs.length) return console.log(chalk.yellow('No data available'));
    
    // Ensure selected pair index is valid
    selectedPairIndex = Math.min(selectedPairIndex, pairs.length - 1);
    const selectedPair = pairs[selectedPairIndex];
    const pairData = currentData[selectedPair];

    // Main pairs table
    console.log(table([
        [chalk.bold('#'), chalk.bold('Pair'), chalk.bold('Price'), chalk.bold('Signal'), chalk.bold('Active')],
        ...pairs.map((pair, idx) => {
            const data = currentData[pair];
            const isSelected = idx === selectedPairIndex;
            const signal = data.analysis?.consensusSignal || 'NONE';
            
            return [
                isSelected ? chalk.yellow(`>${idx}`) : idx,
                isSelected ? chalk.yellow.bold(pair) : pair,
                formatPrice(data.currentPrice),
                signal.includes('BUY') ? chalk.green(signal) : 
                signal.includes('SELL') ? chalk.red(signal) : signal,
                data.orders?.filter(o => ['NEW', 'PARTIALLY_FILLED'].includes(o.status)).length || 0
            ];
        })
    ]));
    
    // Orders for selected pair
    console.log(`\n${chalk.bold('Recent Orders for:')} ${chalk.blue.bold(selectedPair)}`);
    console.log(displayOrderDetails(pairData.orders || []));

    // Analysis summary
    if (pairData.analysis) {
        console.log(`\n${chalk.bold('Analysis Summary:')}`);
        console.log(`Consensus: ${pairData.analysis.consensusSignal}`);
        console.log(`Buy Score: ${pairData.analysis.normalizedBuyScore?.toFixed(2) || 'N/A'}`);
        console.log(`Sell Score: ${pairData.analysis.normalizedSellScore?.toFixed(2) || 'N/A'}`);
    }
}

async function loadAvailableDates() {
    try {
        availableDates = fs.readdirSync(config.ROOT_DB_DIR)
            .filter(dir => fs.statSync(path.join(config.ROOT_DB_DIR, dir)).isDirectory())
            .sort().reverse();
        return availableDates[0];
    } catch (err) {
        console.error(chalk.red('Error loading dates:'), err);
        process.exit(1);
    }
}

async function loadDataForDate(date) {
    try {
        const filePath = path.join(config.ROOT_DB_DIR, date, config.DEFAULT_FILE);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Debug: Log first pair's data to verify structure
        if (config.DEBUG && Object.keys(data).length > 0) {
            const firstPair = Object.keys(data)[0];
            console.log('Sample pair data:', {
                currentPrice: data[firstPair].currentPrice,
                orders: data[firstPair].orders?.slice(0, 1)
            });
        }
        
        return data;
    } catch (err) {
        console.error(chalk.red(`Error loading ${date} data:`), err);
        return {};
    }
}

function setupInput() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', (input) => {
        const pairs = Object.keys(currentData);
        
        if (input === 'q') {
            console.log(chalk.yellow('\nExiting...'));
            process.exit(0);
        } else if (input === 'n') {
            selectedPairIndex = (selectedPairIndex + 1) % pairs.length;
            renderData();
        } else if (input === 'p') {
            selectedPairIndex = (selectedPairIndex - 1 + pairs.length) % pairs.length;
            renderData();
        } else if (!isNaN(input)) {
            const num = parseInt(input);
            if (num >= 0 && num < availableDates.length) {
                switchToDate(num);
            } else if (num >= 0 && num < pairs.length) {
                selectedPairIndex = num;
                renderData();
            }
        }
    });
}

async function switchToDate(dateIndex) {
    currentDateDir = availableDates[dateIndex];
    currentData = await loadDataForDate(currentDateDir);
    selectedPairIndex = 0;
    renderData();
}

(async () => {
    await loadDependencies();
    currentDateDir = await loadAvailableDates();
    currentData = await loadDataForDate(currentDateDir);
    
    setupInput();
    renderData();
    
    setInterval(async () => {
        currentData = await loadDataForDate(currentDateDir);
        renderData();
    }, config.REFRESH_INTERVAL);
})(); 