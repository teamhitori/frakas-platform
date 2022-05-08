import Server, * as httpProxy from 'http-proxy'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import path from 'path'
import chalk from 'chalk';



export class GameContainer {

    public proxy: Server;
    private _be: ChildProcessWithoutNullStreams | undefined;

    constructor(public wsPort: number, private _sourceDir: string) {

        this.proxy = httpProxy.default.createProxyServer({
            target: {
                host: 'localhost',
                port: wsPort
            }
        });
    }

    public async create() {

        await new Promise(resolve => {

            this._be?.kill(9);
            console.log(path.resolve(this._sourceDir, "node.bundle.main.js"));
            this._be = spawn("node", [path.resolve(this._sourceDir, "node.bundle.main.js"), `${this.wsPort}`], { cwd: this._sourceDir });

            this._be.stdout.on("data", (data: any) => {
                console.log(chalk.gray(data));
                if(`${data}`.includes(":Starting ws server on port")){
                    console.log(chalk.blue("Game Started!"))
                    resolve({});
                }
                
            });

            this._be.stderr.on("data", data => {
                console.log(chalk.yellow(data));
            });

            this._be.on('error', (error) => {
                console.log(chalk.red(error));
            });

            this._be.on("close", async code => {
                console.log(chalk.blue("Backend has stopped"));
            });
        });


    }

    public destroy() {
        this._be?.kill(9);
    }
}