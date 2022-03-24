"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameContainer = void 0;
const tslib_1 = require("tslib");
const httpProxy = tslib_1.__importStar(require("http-proxy"));
const child_process_1 = require("child_process");
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
class GameContainer {
    wsPort;
    _sourceDir;
    proxy;
    _be;
    constructor(wsPort, _sourceDir) {
        this.wsPort = wsPort;
        this._sourceDir = _sourceDir;
        this.proxy = httpProxy.default.createProxyServer({
            target: {
                host: 'localhost',
                port: wsPort
            }
        });
    }
    create() {
        this._be?.kill(9);
        this._be = (0, child_process_1.spawn)("node", [path_1.default.resolve("obj", "node.bundle.main.js"), "--port", `${this.wsPort}`], { cwd: this._sourceDir });
        this._be.stdout.on("data", (data) => {
            console.log(chalk_1.default.gray());
        });
        this._be.stderr.on("data", data => {
            console.log(chalk_1.default.gray(data));
        });
        this._be.on('error', (error) => {
            console.log(chalk_1.default.red(error));
        });
        this._be.on("close", async (code) => {
            console.log(chalk_1.default.blue("Backend has stopped"));
        });
    }
    destroy() {
        this._be?.kill(9);
    }
}
exports.GameContainer = GameContainer;
//# sourceMappingURL=gameContainer.js.map