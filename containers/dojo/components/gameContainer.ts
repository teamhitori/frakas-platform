import * as httpProxy from 'http-proxy'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import path from 'path'
import chalk from 'chalk';

export class GameContainer {

    public proxy: any;
    private _be: ChildProcessWithoutNullStreams | undefined;

    constructor(private wsPort: number, private _sourceDir: string) {

        this.proxy = httpProxy.default.createProxyServer({
            target: {
                host: 'localhost',
                port: wsPort
            }
        });
    }

    public create() {

        this._be?.kill(9);
        this._be = spawn("node", [path.resolve("obj", "node.bundle.main.js"), "--port", `${this.wsPort}`], { cwd: this._sourceDir });

        this._be.stdout.on("data", (data: any) => {
            console.log(chalk.gray());
        });

        this._be.stderr.on("data", data => {
            console.log(chalk.gray(data));
        });

        this._be.on('error', (error) => {
            console.log(chalk.red(error));
        });

        this._be.on("close", async code => {
            console.log(chalk.blue("Backend has stopped"));
        });

    }

    public destroy() {
        this._be?.kill(9);
    }
}