const fs = require('fs');

class PairManager {
    constructor(pairsFilePath) {
        this.pairsFile = pairsFilePath;
        this.allPairs = []; // Initialize here
        this.tradeablePairs = [];
        this.loadPairsFromFile(); // Load pairs during initialization
    }

    loadPairsFromFile() {
        try {
            const data = fs.readFileSync(this.pairsFile);
            const pairsData = JSON.parse(data);
            this.allPairs = pairsData.pairs || [];
            this.tradeablePairs = pairsData.tradeablePairs || [];
        } catch (error) {
            console.error('Error reading pairs file, using default pairs:', error);
            this.allPairs = ['BTC_USDT', 'ETH_USDT']; // Default pairs if file read fails
            this.tradeablePairs = [];
        }
    }

    getAllPairs() {
        return this.allPairs; // Method to return all pairs
    }

    getTradeablePairs() {
        return this.tradeablePairs; // Method to return tradeable pairs
    }

    addRemovePair(pair, isAdd, isTradeable) {
        const targetArray = isTradeable ? this.tradeablePairs : this.allPairs;
        const otherArray = isTradeable ? this.allPairs : this.tradeablePairs;

        if (isAdd) {
            if (isTradeable && !otherArray.includes(pair)) {
                return `Cannot add ${pair} to tradeable pairs. It is not in the all pairs list.`;
            }
            if (!targetArray.includes(pair)) {
                targetArray.push(pair);
                this.savePairsToFile();
                return `Added ${pair} to ${isTradeable ? 'tradeable' : 'all'} pairs.`;
            }
            return `${pair} already exists in ${isTradeable ? 'tradeable' : 'all'} pairs.`;
        } else {
            const index = targetArray.indexOf(pair);
            if (index !== -1) {
                targetArray.splice(index, 1);
                this.savePairsToFile();
                return `Removed ${pair} from ${isTradeable ? 'tradeable' : 'all'} pairs.`;
            }
            return `${pair} not found in ${isTradeable ? 'tradeable' : 'all'} pairs.`;
        }
    }

    savePairsToFile() {
        try {
            const data = JSON.stringify({ pairs: this.allPairs, tradeablePairs: this.tradeablePairs }, null, 2);
            fs.writeFileSync(this.pairsFile, data);
        } catch (error) {
            console.error('Error saving pairs to file:', error);
        }
    }
}

module.exports = PairManager;