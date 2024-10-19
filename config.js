const config = {
    isRunning: false,
    loopDelay: 500, //delay for the whole pairs array loop
    pairDelay: false, //delay between pairs, default is false, just for debuggin
    saveData: false,
    alertCooldown: 10 * 60 * 1000, // 10 minutes in milliseconds
    debug: true,
    telegramBotEnabled: true,
    klinesInterval: '2h',
    //server time diffs
    shouldResynch: false,
    timeCheckInterval: 60000,
    maxTimeDifferenceMs: 1000  
};

module.exports = config;