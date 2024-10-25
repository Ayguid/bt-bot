const fs = require('fs');

class PairManager {
    constructor(pairsFilePath) {
        this.pairsFile = pairsFilePath;
        this.allPairs = []; // Initialize here
        this.loadPairsFromFile(); // Load pairs during initialization
    }

    loadPairsFromFile() {
        try {
            const data = fs.readFileSync(this.pairsFile);
            const pairsData = JSON.parse(data);
            this.allPairs = pairsData.pairs || [];
            this.default = { 
                key: "",
                decimals: 2,
                profitMgn: 0.5,
                bellowPrice: 0.25,
                tradeable: true
            }; // Default values for new pairs
        } catch (error) {
            console.error('Error reading pairs file, using default pairs:', error);
            this.allPairs = [{ 
                key: "BTC_USDT",
                decimals: 2,
                profitMgn: 0.5,
                bellowPrice: 0.25,
                tradeable: true
              },
              { 
                key: "ETH_USDT",
                decimals: 2,
                profitMgn: 0.5,
                bellowPrice: 0.25,
                tradeable: true
              }]; // Default pairs if file read fails
        }
    }

    getAllPairs() {
        return this.allPairs; // Method to return all pairs
    }

    getTradeablePairs() {
        return this.allPairs.filter(pair=> pair.tradeable); // Method to return tradeable pairs
    }
    // addRemovePair(pair, isAdd, isTradeable) {
    //     const targetArray = isTradeable ? this.tradeablePairs : this.allPairs;
    //     const otherArray = isTradeable ? this.allPairs : this.tradeablePairs;

    //     if (isAdd) {
    //         if (isTradeable && !otherArray.includes(pair)) {
    //             return `Cannot add ${pair} to tradeable pairs. It is not in the all pairs list.`;
    //         }
    //         if (!targetArray.includes(pair)) {
    //             targetArray.push(pair);
    //             this.savePairsToFile();
    //             return `Added ${pair} to ${isTradeable ? 'tradeable' : 'all'} pairs.`;
    //         }
    //         return `${pair} already exists in ${isTradeable ? 'tradeable' : 'all'} pairs.`;
    //     } else {
    //         const index = targetArray.indexOf(pair);
    //         if (index !== -1) {
    //             targetArray.splice(index, 1);
    //             this.savePairsToFile();
    //             return `Removed ${pair} from ${isTradeable ? 'tradeable' : 'all'} pairs.`;
    //         }
    //         return `${pair} not found in ${isTradeable ? 'tradeable' : 'all'} pairs.`;
    //     }
    // }
    addRemovePair(pairKey, isAdd, isTradeable) {
        const pair = this.allPairs.find(p => p.key === pairKey);
    
        // Adding a new pair to the list (with the given tradeable status)
        if (isAdd) {
            if (!pair) {
                // Add new pair using default values, overriding with key and tradeable
                const newPair = { ...this.default, key: pairKey, tradeable: isTradeable };
                this.allPairs.push(newPair);
                this.savePairsToFile();
                return `Added ${pairKey} to pairs with tradeable set to ${isTradeable}.`;
            } else if (pair.tradeable !== isTradeable) {
                // Update tradeable status if pair exists but the tradeable flag differs
                pair.tradeable = isTradeable;
                this.savePairsToFile();
                return `Updated ${pairKey} tradeable status to ${isTradeable}.`;
            } else {
                return `${pairKey} already exists in the pairs list with the same tradeable status.`;
            }
        }
    
        // Removing a pair from the list entirely if `isAdd` is false
        if (!isAdd && pair) {
            if (isTradeable) {
                // Just change the tradeable status to false
                pair.tradeable = false;
                this.savePairsToFile();
                return `Set ${pairKey} tradeable status to false.`;
            } else {
                // Remove the pair from the list
                this.allPairs = this.allPairs.filter(p => p.key !== pairKey);
                this.savePairsToFile();
                return `Removed ${pairKey} from the pairs list.`;
            }
        }
    
        return `${pairKey} not found in the pairs list.`;
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