const fs = require('fs');

const levels = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
    CRITICAL: 'CRITICAL',
};

const Colors = {
    INFO: '\x1b[32m',
    WARNING: '\x1b[33m',
    ERROR: '\x1b[31m',
    DEBUG: '\x1b[34m',
    CRITICAL: '\x1b[35m',
};

const resetColor = '\x1b[0m';

const logFileDirPath = './logs';
const maximumLogFileSize = 50 * 1024 * 1024; // 100 MB

let logFileExists = fs.existsSync(`${logFileDirPath}/latest.log`)
let logFileSizeInBytes = logFileExists ? fs.statSync(`${logFileDirPath}/latest.log`).size : 0;
let logFolderExists = fs.existsSync(logFileDirPath);
let lastDay = new Date().getDate();

/**
 * This function creates a log entry that is printed to the console and written to a file.
 * @param {String} level - The level of the log entry.
 * @param {String} message - The message of the log entry.
 */
function log(level, message) {
    const date = new Date();
    date.setHours(date.getHours() + 2); // UTC+2 
    const timestamp = date.toISOString().split('T')[1].split('.')[0];
    
    const tracker = new Error();
    const line = tracker.stack.split('\n')[3];
    const result = line.match(/(.*\\)(.*\.js):(\d+):(\d+)/);
    const fileName = result[2];
    const lineNumber = result[3];
    
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(`${Colors[level]}${logMessage}${resetColor} [${fileName}:${lineNumber}]`);
    
    // Create the log directory if it doesn't exist.
    if (!logFolderExists) {
        fs.mkdirSync(logFileDirPath);
        logFolderExists = true;
    }

    // Create the log file and set its size to 0 if it doesn't exist.
    if (!logFileExists) {
        fs.writeFileSync(`${logFileDirPath}/latest.log`, '');
        logFileExists = true;
        logFileSizeInBytes = 0;
    }

    // If the log file size exceeds the maximum size, remove DEBUG entries if they exist, otherwise remove the oldest entries.
    if ((logFileSizeInBytes+4) > maximumLogFileSize) {
        const data = fs.readFileSync(`${logFileDirPath}/latest.log`, 'utf8').split('\n');
        const debugLines = data.filter(line => line.includes('[DEBUG]'));
        if(debugLines.length > 0){
            data.splice(data.indexOf(debugLines[0]), 1);
            const text = data.join('\n');
            fs.writeFileSync(`${logFileDirPath}/latest.log`, text);
            logFileSizeInBytes = text.length;
        }else{
            data.shift();
            const text = data.join('\n');
            fs.writeFileSync(`${logFileDirPath}/latest.log`, text);
            logFileSizeInBytes = text.length;
        }
    }

    // If it's a new day, rename the log file.
    if (date.getDate() !== lastDay) {
        fs.renameSync(`${logFileDirPath}/latest.log`, `${logFileDirPath}/${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`);
        fs.writeFileSync(`${logFileDirPath}/latest.log`, '');
        logFileSizeInBytes = 0;
        lastDay = date.getDate();
    }

    fs.appendFileSync(`${logFileDirPath}/latest.log`, `${logMessage}\n`);
    logFileSizeInBytes += `${logMessage}\n`.length;
}

/**
 * This function is used to assign colors to log levels.
 * @param {String} level - The level of the log entry.
 * @returns {Function} - Returns the function that creates a log entry.
 */
function createLogger(level) {
    return (message) => {
        log(level, message);
    };
}

module.exports = {
    info: createLogger(levels.INFO),
    warning: createLogger(levels.WARNING),
    error: createLogger(levels.ERROR),
    debug: createLogger(levels.DEBUG),
    critical: createLogger(levels.CRITICAL),
};
