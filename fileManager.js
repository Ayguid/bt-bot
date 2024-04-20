//es6 syntax, later convert to it
//import * as fs from 'fs';
const fs = require('node:fs');

const ROOT_DB_DIR = './db';

const DEBUG = false;
//
const saveData = async (dataToSave, fileName) => {
    const INIT_DATE = new Date(); //current date folder
    const dateDirectory = ROOT_DB_DIR + '/' + INIT_DATE.toISOString().split('T')[0];
    //check if folder exists
    if (!fs.existsSync(dateDirectory)){
        await fs.mkdirSync(dateDirectory);
        if (DEBUG)console.log('Folder created successfully');
    } 
    else {
        if (DEBUG) console.log('Folder exists for ' + INIT_DATE);
    }
    //check if file exists
    const contents = JSON.stringify(dataToSave,null, 4);
    
    return await fs.writeFile( dateDirectory +'/'+ fileName, contents, err => {
        if (err) {
            console.log(err);
        } 
        else {
           if (DEBUG) console.log('file written successfully');
        }
    });  
}

module.exports = { saveData };