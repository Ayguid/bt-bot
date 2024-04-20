const percent = (percent, num) => {
    return (num / 100) * percent;
}

const roundDown = (number, decimals) =>{
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}

module.exports = { percent ,roundDown};