const config = {
    debug: true,
    isRunning: false,
    telegramBotEnabled: true,
    saveData: false,
    //
    loopDelay: 500, //delay for the whole pairs array loop
    pairDelay: false, //delay between pairs, default is false, just for debuggin
    alertCooldown: 10 * 60 * 1000, // 10 minutes in milliseconds
    klinesInterval: '2h',
    analysisWindow: 12, //24hr/2hr = 12hr, 24hr trends will be returned
    //server time diffs
    shouldResynch: false,
    timeCheckInterval: 60000,
    maxTimeDifferenceMs: 1000,
    // Margins
    orderQty: 50, // usdt
    profitMargin: 0.5, // 0.5%  
    stopMargin: 1.5,  // 1%
};

module.exports = config;