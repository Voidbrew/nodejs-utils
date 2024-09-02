const ssh2 = require('ssh2');
const Logger = require('./logger');

/**
* Example:
* const SSHService = require('./ssh-service');
* const ssh = new SSHService('127.0.0.1', 22, 'username', 'password');
* await ssh.connect();
* const result = await ssh.exec('ls', ['-l']);
* console.log(result.data);
* await ssh.close();

* Represents an SSH service for establishing and managing SSH connections.
* @class
*/
class SSHService {
    
    /**
     * Escapes a shell argument.
     * @param {string} arg - The argument to escape.
     * @returns {string} The escaped argument.
     */
    escapeShellArg(arg) {
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    
    /**
     * Creates a new SSH service.
     * @param {string} ip - The IP address of the SSH server.
     * @param {number} port - The port of the SSH server.
     * @param {string} username - The username to use for the SSH connection.
     * @param {string} password - The password to use for the SSH connection.
     * @returns {SSHService} The new SSH service.
     */
    constructor(ip, port, username, password) {
        this.ip = ip;
        this.port = port;
        this.username = username;
        this.password = password;
        this.status = false;
        this.ssh = null;
        return this;
    }
    

    /**
     * Connects to the SSH server.
     * @returns {Promise<void>} A promise that resolves when the connection is established.
     */
    async connect(){
        try {
            if(!this.ip || !this.port || !this.username || !this.password)
                throw new Error('Not all data is provided!');
            this.ssh = new ssh2.Client();
            const status = await this.test();
            if(!status) throw new Error('Connection failed!');
            Logger.debug(`SSH connection (${this.ip}:${this.port}) established.`);
            this.status = true;
        } catch (err) {
            Logger.critical(`SSH connection (${this.ip}:${this.port}) ${err}`);
        }
    }

    /**
     * Tests the SSH connection.
     * @returns {Promise<boolean>} A promise that resolves with a boolean indicating whether the connection is successful.
     * @throws {Error} An error is thrown if the connection fails
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
    * Executes a raw command on the SSH server.
    * @param {string} command - The command to execute.
    * @returns {Promise<object>} A promise that resolves with the command result.
    * @throws {Error} An error is thrown if the command fails.
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
     * Executes a command on the SSH server.
     * @param {string} command - The command to execute.
     * @param {string[]} args - The arguments to pass to the command.
     * @returns {Promise<object>} A promise that resolves with the command result.
     * @throws {Error} An error is thrown if the command fails.
     */
    async exec(command, args){
        const safeArgs = args ? args.map(arg => this.escapeShellArg(arg)) : [];
        const safeCommand = `${command} ${safeArgs.join(' ')}`;
        const result = await this.rawExec(safeCommand);
        return result;
    }

    /**
     * Closes the SSH connection.
     * @returns {Promise<boolean>} A promise that resolves with a boolean indicating whether the connection is closed.
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
