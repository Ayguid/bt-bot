//server
const express = require('express');
const app = express();
//
const cors = require('cors'); 
app.use(cors()); //allow cors for now

const port = 5000;
const ip = require('ip');
const ipAddress = ip.address();
//
const fs = require('fs');

//
const ROOT_DB_DIR = './db';
const DEBUG = false;

const INIT_DATE = new Date(); //current date folder
const dateDirectory = ROOT_DB_DIR + '/' + INIT_DATE.toISOString().split('T')[0];

//start server interface
app.get('/account', (req, res) => {
    let obj = JSON.parse(fs.readFileSync(dateDirectory +'/account.json', 'utf8'));
    if (DEBUG) console.log(obj);
    res.json(obj);
});
app.get('/pairs', (req, res) => {
    let obj = JSON.parse(fs.readFileSync(dateDirectory +'/pairs.json', 'utf8'));
    if (DEBUG) console.log(obj);
    res.json(obj);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
    console.log(`Network access via: ${ipAddress}:${port}!`);
});
