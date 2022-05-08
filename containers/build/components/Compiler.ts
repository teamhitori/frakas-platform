import * as fs from 'fs';
import { exec, spawn } from 'child_process'
import { ncp } from 'ncp';
import { CompilationStatus } from '../documents/CompilationStatus'
import { AzStorage } from './AzStorage'
import * as MurmurHash3 from 'imurmurhash';

export class Compiler {

    private _isBuildComplete: boolean = false;
    private _containsErrors: boolean = false;
    private _log: string = "";
    public _azStorage = new AzStorage();
    private _tsc: import("child_process").ChildProcessWithoutNullStreams | undefined;


    constructor(private _userName: string, private _gameName: string) {
        var cl = console.log;
        console.log = (...args) => {
            var message = ``;
            for (var arg in args) {
                message += ` ${args[arg]}`;
            }
            this._log += `${message}\n`;
            cl.apply(console, args);
        }
    }

    public isStarted(): boolean {

        return !!this._tsc && !this._tsc.killed;
    }

    private async _npm(): Promise<void> {

        await new Promise(resolve => {
            exec("npm i", { cwd: `/active/user_${this._userName}_${this._gameName}/` }, async (error, stdout, stderr) => {
                if (error) {
                    console.log(`npm i error: ${error.message}`);
                    //return;
                }
                if (stderr) {
                    console.log(`npm i stderr: ${stderr}`);
                    //return;
                }
                console.log(`npm i stdout: ${stdout}`);

                await new Promise(resolve => setTimeout(resolve, 5000));

                resolve({});
            });
        });

    }

    private async _spawntsc(): Promise<void> {

        this._tsc = spawn("npx", ["frakas", "build"], { cwd: `/active/user_${this._userName}_${this._gameName}/` });

        console.log(`spawn("npx", ["frakas", "build" ], { cwd: /active/user_${this._userName}_${this._gameName}/ });`)

        this._tsc.stdout.on("data", async (data: any) => {
            console.log(`tsc stdout -w: ${data}`);

            if (`${data}`.includes("[Overall build Complete]")) {

                try {
                    console.log("Bundle complete");

                    await this._azStorage.uploadSource(`${this._userName.toLocaleLowerCase()}-${this._gameName.toLocaleLowerCase()}`, `/active/user_${this._userName}_${this._gameName}/obj/`);
    
                } catch (error) {
                    this._isBuildComplete = true
                    this._containsErrors = true;
                    console.log(error);
                }
                finally{
                    this._isBuildComplete = true
                }
            } else if (`${data}`.includes("[Overall build Complete with errors]")) {
                this._isBuildComplete = true
                this._containsErrors = true;
            }
        });

        this._tsc.stderr.on("data", data => {
            console.log(`stderr -w: ${data}`);
            this._isBuildComplete = true
            this._containsErrors = true;
        });

        this._tsc.on('error', (error) => {
            console.log(`error -w: ${error.message}`);
            this._isBuildComplete = true
            this._containsErrors = true;
        });

        this._tsc.on("close", async code => {
            // this._tsc = undefined;
            // console.log(`-w child process exited with code ${code}, re spawning in 5,4,3,2,1..`);
            // await new Promise(resolve => setTimeout(resolve, 5000));
            // this._spawntsc();
            this._isBuildComplete = true
            this._containsErrors = true;
        });

    }

    private async start(force: boolean = false): Promise<void> {
        try {

            if (this._tsc) {
                console.log(`tsc is already running, attempting to kill..`);
                this._tsc?.kill()
                this._tsc = undefined;

                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            if (force) {
                console.log(`*** /active/user_${this._userName}_${this._gameName} npm install`);
                await this._npm();
            } 
            
            console.log(`*** /active/user_${this._userName}_${this._gameName} starting tsc`);

            console.log(`### STARTING /active/user_${this._userName}_${this._gameName} tsc...`);

            await this._spawntsc();

        } catch (error) {
            console.log(error);
            this._tsc?.kill(9);
            this._tsc = undefined;

        }
    }

    public logs(): string {
        return this._log;
    }

    public poll(): CompilationStatus {

        return <CompilationStatus>{
            isComplete: this._isBuildComplete,
            containsErrors: this._containsErrors,
            log: this._log,
        };
    }

    public async set(sourceFiles: { [name: string]: string }) {

        try {
            this._isBuildComplete = false;
            this._containsErrors = false;
            this._log = "";
            var restartCompilation = false;

            delete sourceFiles["package-lock.json"];

            console.log("set files:");

            for (const fileName in sourceFiles) {

                console.log(fileName);

                if (Object.prototype.hasOwnProperty.call(sourceFiles, fileName)) {
                    const content = sourceFiles[fileName];

                    var spilt = `/active/user_${this._userName}_${this._gameName}/${fileName}`.split("/");
                    var directory = spilt.slice(0, spilt.length - 1).join("/");

                    if (fileName == "tsconfig.json" || fileName == "package.json") {
                        if (fs.existsSync(`/active/user_${this._userName}_${this._gameName}/${fileName}`)) {
                            var currentHash = MurmurHash3.default(fs.readFileSync(`/active/user_${this._userName}_${this._gameName}/${fileName}`, 'utf8')).result();
                            var newHash = MurmurHash3.default(content).result();
                            if (currentHash != newHash) {
                                restartCompilation = true;
                            }
                        } else {
                            restartCompilation = true;
                        }
                    }
                }
            }

            if (!fs.existsSync("/active")) {
                console.log("Creating /active");
                fs.mkdirSync("/active");
            }

            if (!fs.existsSync(`/active/user_${this._userName}_${this._gameName}`)) {
                console.log(`Creating /active/user_${this._userName}_${this._gameName}`);
                fs.mkdirSync(`/active/user_${this._userName}_${this._gameName}/`);
            }

            // remove all files from directory that are not in files and not exceptional
            var files = fs.readdirSync(`/active/user_${this._userName}_${this._gameName}/`);

            files?.forEach(file => {

                const fileName = file.replace(/\.[^/.]+$/, "");

                if (sourceFiles[fileName]) {
                    console.log(`Skippping rm ${file}, excluded`)
                } else {
                    if (!fs.existsSync(`/active/user_${this._userName}_${this._gameName}/${file}`)) {
                        console.log(`Removing ${file}`);
                        fs.rmSync(`/active/user_${this._userName}_${this._gameName}/${file}`);
                    }

                }
            });

            for (const fileName in sourceFiles) {

                if (Object.prototype.hasOwnProperty.call(sourceFiles, fileName)) {
                    const content = sourceFiles[fileName];

                    var spilt = `/active/user_${this._userName}_${this._gameName}/${fileName}`.split("/");
                    var directory = spilt.slice(0, spilt.length - 1).join("/");

                    fs.mkdirSync(directory, { recursive: true });

                    fs.writeFileSync(`/active/user_${this._userName}_${this._gameName}/${fileName}`, content);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            await this.start(restartCompilation);


        } catch (error) {
            console.log(error);

        }
    }
}