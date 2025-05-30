const TelegramBot = require('node-telegram-bot-api');
//fix for some networks blocking the req
const axios = require('axios');
//
class TelegramBotHandler {
    constructor(config, handleCommandCallback) {
        this.config = config;
        this.handleCommandCallback = handleCommandCallback;
        this.groupChatLastAlertTimes = { buy: {}, sell: {} };
    }

    initialize() {
        if (!this.config.telegramBotEnabled) {
            console.log('Telegram bot is disabled via configuration.');
            return; // Do not initialize the bot if disabled
        }
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            throw new Error('Telegram bot token not set in environment variables.');
        }
        this.tBot = new TelegramBot(token, { polling: true, request: {
            family: 4,  // Force IPv4
            timeout: 30000
        }});
        this.tBot.on("polling_error", (msg) => console.log(msg));
        this.tBot.on('message', this.handleTelegramMessage.bind(this));
    }
    
    async handleTelegramMessage(msg) {
        if (msg.from.id !== Number(process.env.TELEGRAM_MY_ID)) return;
        await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, `Received your message '${msg.text}'`);
        const [command, ...args] = msg.text.split(' ');
        const response = await this.handleCommandCallback(command, args);
        await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, response);
    }

    async sendGroupChatAlert(pair, analysis) {
        if (!this.config.telegramBotEnabled) {
            console.log(`Telegram bot is disabled, not sending alert for ${pair}.`);
            return; // Exit early if the Telegram bot is disabled
        }
        const normalizedSignal = analysis.consensusSignal.toLowerCase();
        //if (!['buy', 'sell'].includes(normalizedSignal)) return;
        const currentTime = Date.now();
        if (!this.groupChatLastAlertTimes[normalizedSignal]) {
            this.groupChatLastAlertTimes[normalizedSignal] = {};
        }
        const lastAlertTime = this.groupChatLastAlertTimes[normalizedSignal][pair] || 0;
        const timeSinceLastAlert = currentTime - lastAlertTime;
        if (timeSinceLastAlert >= this.config.alertCooldown) {
            try {
                this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `${normalizedSignal} signal for ${pair}`);
                this.groupChatLastAlertTimes[normalizedSignal][pair] = currentTime;
                console.log(`Alert sent for ${pair} (${normalizedSignal})`);
            } catch (error) {
                console.error(`Failed to send alert for ${pair} (${normalizedSignal}):`, error);
            }
        } else {
            console.log(`Alert for ${pair} (${normalizedSignal}) skipped. Cooldown: ${this.config.alertCooldown - timeSinceLastAlert}ms remaining`);
        }
    }
}

module.exports = TelegramBotHandler;