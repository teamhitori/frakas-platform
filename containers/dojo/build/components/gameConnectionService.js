"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameConnectionService = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const http = tslib_1.__importStar(require("http"));
const AzStorage_1 = require("./AzStorage");
const gameContainer_1 = require("./gameContainer");
const Topic_1 = require("../documents/Topic");
class gameConnectionService {
    _wsProxyPort = 8080;
    _nextWsPort = 1000;
    _containers = {};
    //private _client: appInsights.TelemetryClient;
    _connections = {};
    _connectionGame = {};
    constructor() {
        // appInsights.setup(process.env.APPLICATIONINSIGHTS_KEY)
        //     .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
        //     .start();
        // this._client = appInsights.defaultClient;
        this._initWebsocket();
        this._initExpress();
    }
    _initExpress() {
        const port = process.env.port || 80;
        const app = (0, express_1.default)();
        app.listen(port);
        console.log(`Starting express server on port ${port}`);
        // parse application/json
        app.use(express_1.default.json());
        app.get("/create-game/:gamePrimaryName/:containerRef", async (req, res) => {
            try {
                await this._createGame(req.params.gamePrimaryName, req.params.containerRef);
                res.sendStatus(200);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });
        app.get("/destroy-game/:gamePrimaryName", (req, res) => {
            try {
                this._destroyGame(req.params.gamePrimaryName);
                res.sendStatus(200);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });
    }
    _initWebsocket() {
        var proxyServer = http.createServer(function (req, res) {
            //proxy.web(req, res);
        });
        //
        // Listen to the `upgrade` event and proxy the
        // WebSocket requests as well.
        //
        proxyServer.on('upgrade', function (req, socket, head) {
            console.log(`upgrade`, req, head);
            //proxy.ws(req, socket, head);
        });
        console.log(`Starting proxy ${this._wsProxyPort}`);
        proxyServer.listen(this._wsProxyPort);
    }
    async _createGame(gamePrimaryName, sourceRef) {
        try {
            console.log(`createGame called. gamePrimaryName:${gamePrimaryName}`);
            var azStorage = new AzStorage_1.AzStorage();
            var containerName = "reubenh-default-be";
            await azStorage.downloadBESource(sourceRef, gamePrimaryName);
            if (!this._containers[gamePrimaryName]) {
                this._containers[gamePrimaryName] = new gameContainer_1.GameContainer(this._nextWsPort, `/usersource/${gamePrimaryName}`);
            }
            this._nextWsPort++;
            await this._containers[gamePrimaryName]?.create();
        }
        catch (ex) {
            console.log(ex);
            //this._client.trackException({ exception: ex });
        }
    }
    _destroyGame(gamePrimaryName) {
        console.log(`destroyGame called, gamePrimaryName:${gamePrimaryName}`);
        this._containers[gamePrimaryName]?.destroy();
        for (const connectionId in this._connectionGame) {
            if (Object.prototype.hasOwnProperty.call(this._connectionGame, connectionId)) {
                const gamePrimaryName = this._connectionGame[connectionId];
                if (gamePrimaryName == gamePrimaryName) {
                    var socket = this._connections[connectionId];
                    console.log(`Sending GameExit to connectionId:${connectionId}`);
                    socket?.send(JSON.stringify({ topic: Topic_1.Topic.gameEnd }));
                }
            }
        }
    }
}
exports.gameConnectionService = gameConnectionService;
//# sourceMappingURL=gameConnectionService.js.map