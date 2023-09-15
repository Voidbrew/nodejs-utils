/*  
    A logger modul egy egyszerű naplózó modul, ami a konzolra és fájlba is írja a naplóbejegyzéseket.

    Dependenciák:
    - fs
    
    Konstansok:
    - levels: A naplóbejegyzések szintjei
    - Colors: A naplóbejegyzések szintjeinek színei
    - logLevelsColorsReset: A naplóbejegyzések szintjeinek színeinek visszaállítása

    Változók:
    - logFileDirPath: A naplófájlok könyvtára
    - maximumLogFileSize: A naplófájlok maximális mérete
    - logFileExists: A naplófájl létezése
    - logFileSizeInBytes: A naplófájl mérete
    - lastDay: Az utolsó naplófájl létrehozásának napja

    Függvények:
    - log(level: string, message: string, file?: string, line?: number): void
        - level: A naplóbejegyzés szintje
        - message: A naplóbejegyzés üzenete
        - file: A fájl, ahol a naplóbejegyzés történt
        - line: A sor, ahol a naplóbejegyzés történt
    - info(message: string, file?: string, line?: number): void
    - warning(message: string, file?: string, line?: number): void
    - error(message: string, file?: string, line?: number): void
    - debug(message: string, file?: string, line?: number): void
    - critical(message: string, file?: string, line?: number): void

    Példa használat:
    const Logger = require('./logger');
    Logger.info('A szerver elindult!');

 */

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

function log(level, message) {
    const date = new Date();
    date.setHours(date.getHours() + 2); // UTC+2 
    const timestamp = date.toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(`${Colors[level]}${logMessage}${resetColor}`);
    
    // Ha nem létezik a naplókönyvtár, akkor létrehozzuk.
    if (!logFolderExists) {
        fs.mkdirSync(logFileDirPath);
        logFolderExists = true;
    }

    // Ha nem létezik a naplófájl, akkor létrehozzuk és beállítjuk a méretét 0-ra.
    if (!logFileExists) {
        fs.writeFileSync(`${logFileDirPath}/latest.log`, '');
        logFileExists = true;
        logFileSizeInBytes = 0;
    }

    // Ha túl nagy a naplófájl, akkor töröljük elöszőr a DEBUG bejegyzéseket, ha nincs, akkor pedig a legrégebbi bejegyzéseket.
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

    // Ha új nap van, akkor átnevezzük a naplófájlt
    if (date.getDate() !== lastDay) {
        fs.renameSync(`${logFileDirPath}/latest.log`, `${logFileDirPath}/${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`);
        fs.writeFileSync(`${logFileDirPath}/latest.log`, '');
        logFileSizeInBytes = 0;
        lastDay = date.getDate();
    }

    fs.appendFileSync(`${logFileDirPath}/latest.log`, `${logMessage}\n`);
    logFileSizeInBytes += `${logMessage}\n`.length;
}

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
