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
  
//console.log(minusPercent(100,30)); // 70

//console.log(plusPercent(60000, 0.7));

module.exports = { percent , roundDown, minusPercent, plusPercent, timePassed };