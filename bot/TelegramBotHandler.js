const TelegramBot = require('node-telegram-bot-api');

class TelegramBotHandler {
    constructor(config, handleCommandCallback) {
        this.config = config;
        this.handleCommandCallback = handleCommandCallback;
        this.lastAlertTimes = { buy: {}, sell: {} };
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
        this.tBot = new TelegramBot(token, { polling: true });
        this.tBot.on('message', this.handleTelegramMessage.bind(this));
    }

    async handleTelegramMessage(msg) {
        if (msg.from.id !== Number(process.env.TELEGRAM_MY_ID)) return;
        await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, `Received your message '${msg.text}'`);
        const [command, ...args] = msg.text.split(' ');
        const response = await this.handleCommandCallback(command, args);
        await this.tBot.sendMessage(process.env.TELEGRAM_MY_ID, response);
    }

    async sendAlert(pair, signal) {
        if (!this.config.telegramBotEnabled) {
            console.log(`Telegram bot is disabled, not sending ${signal} alert for ${pair}.`);
            return; // Exit early if the Telegram bot is disabled
        }
        const normalizedSignal = signal.toLowerCase();
        if (!['buy', 'sell'].includes(normalizedSignal)) return;
        const currentTime = Date.now();
        if (!this.lastAlertTimes[normalizedSignal]) {
            this.lastAlertTimes[normalizedSignal] = {};
        }
        const lastAlertTime = this.lastAlertTimes[normalizedSignal][pair] || 0;
        const timeSinceLastAlert = currentTime - lastAlertTime;
        if (timeSinceLastAlert >= this.config.alertCooldown) {
            try {
                this.tBot.sendMessage(process.env.TELEGRAM_GROUPCHAT_ID, `${signal} signal for ${pair}`);
                this.lastAlertTimes[normalizedSignal][pair] = currentTime;
                console.log(`Alert sent for ${pair} (${signal})`);
            } catch (error) {
                console.error(`Failed to send alert for ${pair} (${signal}):`, error);
            }
        } else {
            console.log(`Alert for ${pair} (${signal}) skipped. Cooldown: ${this.config.alertCooldown - timeSinceLastAlert}ms remaining`);
        }
    }
}

module.exports = TelegramBotHandler;