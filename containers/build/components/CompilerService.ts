import { Express } from 'express';
import * as bodyParser from 'body-parser'
import { Compiler } from './Compiler'

export class CompilerService {

    private _compilers: { [name: string]: Compiler } = {};

    constructor(private _app: Express) {
        this.init();
    }

    init() {

        // parse application/x-www-form-urlencoded
        this._app.use(bodyParser.urlencoded({ extended: false, limit: '20mb' }))

        // parse application/json
        this._app.use(bodyParser.json({limit: '20mb'}))

        // this._app.get("/start/:userId/:gameName", async (req, res) => {
        //     try {
        //         console.log(`GET:/start/${req.params.userId}/${req.params.gameName}`);
        //         var compiler = this._compilers[`${req.params.userId}_${req.params.gameName}`];

        //         if (!compiler) {
        //             compiler = new Compiler(req.params.userId, req.params.gameName);
        //             this._compilers[`${req.params.userId}_${req.params.gameName}`] = compiler;
        //         }

        //         if (!compiler.isStarted()) {
        //             await compiler.start();
        //         }

        //         res.json({
        //             isStarted: true
        //         });
        //     } catch (error) {
        //         console.log(error);
        //         res.sendStatus(500);
        //     }
        // });

        this._app.get("/logs/:userId/:gameName", (req, res) => {
            try {
                console.log(`GET:/logs/${req.params.userId}/${req.params.gameName}`);
                var compiler = this._compilers[`${req.params.userId}_${req.params.gameName}`];

                var logs = compiler ? compiler.logs() : null;

                res.json(logs);

            } catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });

        this._app.get("/poll/:userId/:gameName", (req, res) => {
            try {
                console.log(`GET:/poll/${req.params.userId}/${req.params.gameName}`);
                var compiler = this._compilers[`${req.params.userId}_${req.params.gameName}`];

                var source = compiler ? compiler.poll() : null;

                res.json(source);

            } catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });

        this._app.post('/set/:userId/:gameName', async (req, res) => {

            try {
                console.log(`POST:/set/${req.params.userId}/${req.params.gameName}`);
                var compiler = this._compilers[`${req.params.userId}_${req.params.gameName}`];

                if (!compiler) {
                    compiler = new Compiler(req.params.userId, req.params.gameName);
                    this._compilers[`${req.params.userId}_${req.params.gameName}`] = compiler;
                }

                console.log('Got body:', req.body);

                compiler.set(req.body);

                res.sendStatus(200);
            } catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });

    }

}