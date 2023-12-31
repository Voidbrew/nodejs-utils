/*: 
 
    Ez a fájl egy SSHService osztályt exportál, ami lehetővé teszi egy
    távoli szerverhez való kapcsolódást és parancsok futtatását SSH-n keresztül. 
 
    Dependenciák: 
    - ssh2: SSH kapcsolat kezeléséhez 
    - Logger: Naplózáshoz 
 
    Konstansok: 
    Nincsenek konstansok. 

    Változók:
    - ip: string - A szerver IP címe
    - port: number - A szerver portja
    - username: string - A szerverhez való kapcsolódáshoz szükséges felhasználónév
    - password: string - A szerverhez való kapcsolódáshoz szükséges jelszó
    - status: boolean - A kapcsolat állapota
    - ssh: ssh2.Client - A kapcsolatot kezelő SSH objektum
 
    Függvények: 
    - escapeShellArg(arg: Array): string - Kiszűri a veszélyes karaktereket egy parancsból
    - constructor(ip: string, port: number, username: string, password: string): void - Osztály konstruktora 
    - connect(): Promise<void> - Kapcsolódás a szerverhez 
    - test(): Promise<boolean> - Kapcsolat tesztelése 
    - rawExec(command: string): Promise<Object> - Parancs végrehajtása nyers kimenettel 
    - exec(command, args): Promise<string> - Parancs végrehajtása feldolgozott kimenettel 
    - close(): Promise<void> - Kapcsolat bontása 
 
    Példa használat:
    const SSHService = require('./ssh');

    const ssh = new SSHService('127.0.0.1', 22, 'user', 'password');

    ssh.connect()
    .then(() => {
        ssh.exec('ls -l')
        .then(result => {
            console.log(result);  
        });
    });
*/
const ssh2 = require('ssh2');
const Logger = require('./logger');

class SSHService {

    /**
     * Kiszűri a veszélyes karaktereket egy parancsból
     * @param {Array} arg : A parancs argumentumai
     * @returns {string} : A veszélyes karakterektől megtisztított parancs
     */
    escapeShellArg(arg) {
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    
    constructor(ip,port,username,password) {

        this.ip = ip;
        this.port = port;
        this.username = username;
        this.password = password;
        this.status = false;

        this.ssh = null;

        return this;
    }
    
    /**
     * Kapcsolódás a szerverhez
     * @returns {Promise<void>} : A kapcsolat állapotától függően true vagy false
     * @throws {Error} : Ha nem sikerült a kapcsolódás
     */
    async connect(){
        try {

            if(!this.ip || !this.port || !this.username || !this.password)
                throw new Error('Nincs megadva minden adat!');

            this.ssh = new ssh2.Client();

            const status = await this.test();
            if(!status) throw new Error('Nem sikerült a kapcsolódás!');

            Logger.debug(`SSH (${this.ip}:${this.port}) kapcsolat létrejött.`);
            this.status = true;

        } catch (err) {
            Logger.critical(`SSH (${this.ip}:${this.port}) ${err}`);
        }
    }

    /**
     * Ezzel csak tesztelni lehet a kapcsolatot.
     * @returns {Promise<boolean>} : A kapcsolat állapotától függően true vagy false
     * @throws {Error} : Ha nem sikerült a kapcsolódás
     */
    async test() {
        return new Promise((resolve, reject) => {
            this.ssh.on('ready', () => {
                resolve(true);
            }).on('error', (err) => {
                reject(err);
            }
            ).connect({
                host: this.ip,
                port: this.port,
                username: this.username,
                password: this.password
            });
        });
    }

    /**
     * Nyers bemenetű parancs végrehajtása
     * @param {string} command 
     * @returns {Promise<Object>} : A parancs végrehajtásának eredménye
     */
    async rawExec(command) {
        return new Promise((resolve, reject) => {
            this.ssh.exec(command, (err, stream) => {
                if (err) reject(err);
                let data = '';
                stream.on('data', (chunk) => {
                    data += chunk;
                }).stderr.on('data', (chunk) => {
                    data += chunk;
                }).on('close', (code, signal) => {
                    resolve({code: code, signal: signal, data: data});
                });
            });
        });
    }

    /**
     * Védett parancs végrehajtása
     * @param {string} command 
     * @param {Array} args 
     * @returns {Promise<string>} : A parancs végrehajtásának eredménye
     */
    async exec(command, args){
        const safeArgs = args ? args.map(arg => this.escapeShellArg(arg)) : [];
        const safeCommand = `${command} ${safeArgs.join(' ')}`;
        const result = await this.rawExec(safeCommand);
        return result;
    }

    /**
     * A kapcsolatot bontja
     * @returns {Promise<boolean>} : A kapcsolat bontása utána true
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.ssh.on('end', () => {
                this.status = false;
                resolve(true);
            }).end();
        });
    }

}

module.exports = SSHService;
