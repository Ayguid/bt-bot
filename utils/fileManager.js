const fs = require('node:fs');
const path = require('node:path');

const config = {
    ROOT_DB_DIR: './db',
    DEBUG: false,
};

const logError = (message, err) => {
    console.error(`${message}:`, err);
};

const saveData = async (dataToSave, fileName) => {
    const initDate = new Date(); // current date folder
    const dateDirectory = path.join(config.ROOT_DB_DIR, initDate.toISOString().split('T')[0]);

    // Check if folder exists and create it if it doesn't
    if (!fs.existsSync(dateDirectory)) {
        try {
            await fs.promises.mkdir(dateDirectory, { recursive: true });
            if (config.DEBUG) console.log('Folder created successfully:', dateDirectory);
        } catch (err) {
            logError('Error creating directory', err);
            return; // Exit if directory creation fails
        }
    } else {
        if (config.DEBUG) console.log('Folder exists for', initDate);
    }

    // Prepare the contents for writing
    const contents = JSON.stringify(dataToSave, null, 4);
    
    // Write the file
    try {
        await fs.promises.writeFile(path.join(dateDirectory, fileName), contents);
        if (config.DEBUG) console.log('File written successfully:', fileName);
    } catch (err) {
        logError('Error writing file', err);
    }
};

module.exports = { saveData };
