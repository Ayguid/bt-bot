class RateLimitedQueue {
    constructor(rateLimit, burstLimit, maxConcurrent = 20) {
        this.rateLimit = rateLimit;
        this.burstLimit = burstLimit;
        this.maxConcurrent = maxConcurrent;
        this.tokens = burstLimit;
        this.lastRefill = Date.now();
        this.queue = [];
        this.running = 0;
    }

    refillTokens() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const refillAmount = (timePassed / 1000) * (this.rateLimit / 60);
        this.tokens = Math.min(this.burstLimit, this.tokens + refillAmount);
        this.lastRefill = now;
    }

    async waitForToken() {
        while (true) {
            this.refillTokens();
            if (this.tokens > 0) {
                this.tokens--;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    enqueue(fn) {
        this.queue.push(fn);
        this.dequeue();
    }

    async dequeue() {
        if (this.running >= this.maxConcurrent) return;

        const item = this.queue.shift();
        if (!item) return;

        this.running++;
        await this.waitForToken();
        item(async () => {
            this.running--;
            this.dequeue();
        });
    }
}


module.exports = RateLimitedQueue;