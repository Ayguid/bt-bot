//Helper functions
const percent = (percent, num) => {
    return (num / 100) * percent;
}
const roundDown = (number, decimals) =>{
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}
const minusPercent = (p, n) => {
    return n - (n * (p/100));
}
const plusPercent = (p, n) => {
    return n + (n * (p/100));
}
const timePassed = (start) =>{
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

module.exports = { percent , roundDown, minusPercent, plusPercent, timePassed, calculateProfit, getLastElement };