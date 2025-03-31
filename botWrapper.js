const { spawn } = require('child_process');

const startBot = () => {
    //const botProcess = spawn('node', ['./bot/TradingBot.js'], { stdio: 'inherit' });
    const botProcess = spawn('node', ['./bot/multi/TradingBot-multi.js'], { stdio: 'inherit' });

    botProcess.on('exit', (code) => {
        console.log(`Bot exited with code ${code}. Restarting...`);
        startBot(); // Restart the bot
    });

    botProcess.on('error', (err) => {
        console.error('Failed to start bot:', err);
    });
};

// Start the bot for the first time and if exit occurs restart
startBot();

/*

const { execSync } = require('child_process');
const TradingBot = require('./TradingBot');

// Define synchronizeTime method inside botWrapper using execSync
const synchronizeTime = () => {
    try {
        // Resynchronize system time using system command (for Linux/Unix)
        execSync('sudo ntpdate pool.ntp.org'); // Adjust the command for your OS if needed
        console.log('System time synchronized successfully.');

        // After syncing time, restart the bot by exiting the process
        console.log('Restarting the bot...');
        process.exit(0); // This will stop the bot, and nodemon will restart it
    } catch (error) {
        console.error('Failed to resynchronize time:', error);
    }
};

// Initialize TradingBot and pass synchronizeTime function as a callback
const bot = new TradingBot(synchronizeTime);
bot.init();
bot.startBot();

*/