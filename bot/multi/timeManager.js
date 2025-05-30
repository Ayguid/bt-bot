const { execSync } = require('child_process'); // To run system commands for time synchronization
const { serverTime } = require('../../utils/binance-spot');

class TimeManager {
  constructor(config, makeQueuedRequest) {
    this.config = config;
    this.makeQueuedReq = makeQueuedRequest;
    this.timeCheckInterval = null;
  }

  /**
   * Starts periodic time synchronization checks
   */
  startTimeCheck() {
    const timeCheckInterval = this.config.timeCheckInterval || 60000; // Default 1 minute
    
    // Clear existing interval if running
    if (this.timeCheckInterval) {
      clearInterval(this.timeCheckInterval);
    }
    
    // Start new interval
    this.timeCheckInterval = setInterval(
      () => this.checkTimeDifference(), 
      timeCheckInterval
    );
    
    console.log('⌚ Time synchronization checks started');
  }

  /**
   * Stops time synchronization checks
   */
  stopTimeCheck() {
    if (this.timeCheckInterval) {
      clearInterval(this.timeCheckInterval);
      this.timeCheckInterval = null;
      console.log('⌚ Time synchronization checks stopped');
    }
  }

  /**
   * Fetches server time from exchange
   * @returns {Promise<Object>} Server time response
   */
  async fetchServerTime() {
    try {
      return await this.makeQueuedReq(serverTime);
    } catch (error) {
      console.error('⌚ Failed to fetch server time:', error);
      throw error;
    }
  }

  /**
   * Checks difference between local and server time
   */
  async checkTimeDifference() {
    try {
      const serverTimeData = await this.fetchServerTime();
      if (!serverTimeData || serverTimeData.error) {
        console.error('⌚ Invalid server time response');
        return;
      }

      const serverTimestamp = serverTimeData.serverTime;
      const localTimestamp = Date.now();
      const timeDifference = Math.abs(localTimestamp - serverTimestamp);

      console.log(`⌚ Time difference: ${timeDifference}ms` +
                ` (Max allowed: ${this.config.maxTimeDifferenceMs}ms)`);

      if (timeDifference > this.config.maxTimeDifferenceMs) {
        console.warn('⌚ Time difference exceeds threshold!');
        if (this.config.shouldResynch) {
          await this.resynchronizeTime();
        }
      }
    } catch (error) {
      console.error('⌚ Error in time difference check:', error);
    }
  }

  /**
   * Synchronizes system time with NTP server
   * @returns {boolean} True if successful
   */
  async resynchronizeTime() {
    try {
      console.log('⌚ Attempting time synchronization...');
      execSync('sudo ntpdate pool.ntp.org');
      console.log('⌚ Time synchronized successfully');
      return true;
    } catch (error) {
      console.error('⌚ Time synchronization failed:', error);
      return false;
    }
  }
}

module.exports = TimeManager;