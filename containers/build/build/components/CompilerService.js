"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerService = void 0;
const tslib_1 = require("tslib");
const bodyParser = tslib_1.__importStar(require("body-parser"));
const Compiler_1 = require("./Compiler");
class CompilerService {
    _app;
    _compilers = {};
    constructor(_app) {
        this._app = _app;
        this.init();
    }
    init() {
        // parse application/x-www-form-urlencoded
        this._app.use(bodyParser.urlencoded({ extended: false, limit: '20mb' }));
        // parse application/json
        this._app.use(bodyParser.json({ limit: '20mb' }));
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
            }
            catch (error) {
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
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });
        this._app.post('/set/:userId/:gameName', async (req, res) => {
            try {
                console.log(`POST:/set/${req.params.userId}/${req.params.gameName}`);
                var compiler = this._compilers[`${req.params.userId}_${req.params.gameName}`];
                if (!compiler) {
                    compiler = new Compiler_1.Compiler(req.params.userId, req.params.gameName);
                    this._compilers[`${req.params.userId}_${req.params.gameName}`] = compiler;
                }
                console.log('Got body:', req.body);
                compiler.set(req.body);
                res.sendStatus(200);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });
    }
}
exports.CompilerService = CompilerService;
//# sourceMappingURL=CompilerService.js.map