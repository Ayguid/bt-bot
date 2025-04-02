//Helper functions
const percent = (percent, num) => {
    return (num / 100) * percent;
}
const roundDown = (number, decimals) =>{
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}
const minusPercent = (p, n) => {
    const pInt = parseFloat(n)
    return pInt - (pInt * (p/100));
}
const plusPercent = (p, n) => {
    const pInt = parseFloat(n)
    return pInt + (pInt * (p/100));
}
const timePassed = (start) =>{ //1729826486254
    // get the end time 
    let end = Date.now(); 
    // elapsed time in milliseconds 
    let elapsed = end - start;    
    // converting milliseconds to seconds  
    // by dividing 1000 
    return (elapsed/1000); 
}
const calculateProfit = (currentPrice, orderPrice) => {
    let profit = ((currentPrice/orderPrice) - 1) * 100;
    return profit;
}

const getLastElement = (array) => {
    return array.slice(-1)[0];//array[array.length -1]; but non destructive
}

const wait = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { percent , roundDown, minusPercent, plusPercent, timePassed, calculateProfit, getLastElement, wait };