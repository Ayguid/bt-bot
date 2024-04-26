const percent = (percent, num) => {
    return Number((num / 100) * percent);
}

const roundDown = (number, decimals) =>{
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}

const minusPercent =(n,p) => {
    return n - (n * (p/100));
}
const plusPercent =(n,p) => {
    return n + (n * (p/100));
}
  
//console.log(minusPercent(100,30)); // 70

//console.log(plusPercent(60000, 0.7));

module.exports = { percent , roundDown, minusPercent, plusPercent };