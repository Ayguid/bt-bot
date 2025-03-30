const fs = require('fs');

class PairManager {
    constructor(pairsFilePath) {
        this.pairsFile = pairsFilePath;
        this.allPairs = []; // Initialize here
        this.loadPairsFromFile(); // Load pairs during initialization
    }
    //
    loadPairsFromFile() {
        //console.log('Loading pairs from file');
        try {
            const data = fs.readFileSync(this.pairsFile);
            const pairsData = JSON.parse(data);
            this.allPairs = pairsData || [];
            this.default = { 
                key: "",
                profitMgn: 0.5,
                belowPrice: 0.15,
                orderQty: 50, // represents second asset in pair, in this case usdt
                okLoss: -2,
                okDiff: 2,
                tradeable: true
            }; // Default values for new pairs 
        } catch (error) {
            console.error('Error reading pairs file, using default pairs:', error);
            this.allPairs = [{ 
                key: "BTC_USDT",
                profitMgn: 0.5,
                belowPrice: 0.15,
                orderQty: 50, //_usdt
                okLoss: -2,
                okDiff: 2,
                tradeable: true
              },
              { 
                key: "ETH_USDT",
                profitMgn: 0.5,
                belowPrice: 0.15,
                orderQty: 50,
                okLoss: -2,
                okDiff: 2,
                tradeable: true
              }]; // Default pairs if file read fails
        }
    }
    //
    validatePair(object){//move to Pairmanager
        // const schema = {
        //     name: value => /^([A-Z][a-z\-]* )+[A-Z][a-z\-]*( \w+\.?)?$/.test(value),
        //     age: value => parseInt(value) === Number(value) && value >= 18,
        //     phone: value => /^(\+?\d{1,2}-)?\d{3}-\d{3}-\d{4}$/.test(value)
        //   };
        const schema = {
            key: value => typeof value == "string",
            profitMgn: value =>parseFloat(value) === Number(value),
            belowPrice: value =>parseFloat(value) === Number(value),
            orderQty: value =>parseFloat(value) === Number(value),
            okLoss: value =>parseFloat(value) === Number(value),
            okDiff: value =>parseFloat(value) === Number(value),
            tradeable: value => typeof value == "boolean"
        }
        schema.key.required = true;
        schema.profitMgn.required = true;
        schema.belowPrice.required = true;
        schema.orderQty.required = true;
        schema.okLoss.required = true;
        schema.okDiff.required = true;
        schema.tradeable.required = true;

        return Object
        .entries(schema)
        .map(([key, validate]) => [
          key,
          !validate.required || (key in object),
          validate(object[key])
        ])
        .filter(([_, ...tests]) => !tests.every(Boolean))
        .map(([key, invalid]) => new Error(`${key} is ${invalid ? 'invalid' : 'required'}.`));
    }
    //
    getAllPairs() {
        //return this.allPairs; // Method to return all pairs
        return this.allPairs.filter((pair) => {
            const pairValidate = this.validatePair(pair);
            if (pairValidate.length > 0) {
                console.log('Errors processing pair', pair);
                for (const { message } of pairValidate) {
                    console.log(message);
                }
                return null;
            } else {
                return pair;
            }
        });
    }
    //
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
    //
    savePairsToFile() {
        try {
            const data = JSON.stringify(this.allPairs, null, 2);
            fs.writeFileSync(this.pairsFile, data);
        } catch (error) {
            console.error('Error saving pairs to file:', error);
        }
    }
}

module.exports = PairManager;