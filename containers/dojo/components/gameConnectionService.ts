import * as appInsights from 'applicationinsights';
import express from 'express';
import * as httpProxy from 'http-proxy';
import * as http from 'http';
import net from 'net';
import WebSocket, { WebSocketServer } from 'ws';

import { azStorage } from './azStorage';
import { GameContainer } from './gameContainer';
import { ISocketConnectedDocument } from '../documents/ISocketConnectedDocument';
import { Topic } from '../documents/Topic'

export class gameConnectionService {

    private _wsProxyPort = 8080
    private _nextWsPort = 1000;

    private _containers: { [name: string]: GameContainer } = {};
    //private _client: appInsights.TelemetryClient;
    private _connections: { [name: string]: WebSocket } = {};
    private _connectionGame: { [name: string]: string } = {};

    constructor() {
        // appInsights.setup(process.env.APPLICATIONINSIGHTS_KEY)
        //     .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
        //     .start();

        // this._client = appInsights.defaultClient;

        this._initWebsocket();
        this._initExpress();
    }


    private _initExpress() {
        const port: string | number = process.env.port || 80;

        const app = express();

        app.listen(port);

        console.log(`Starting express server on port ${port}`);

        // parse application/json
        app.use(express.json());

        app.get("/status/:gamePrimaryName/", async (req, res) => {
            try {
                if (this._containers[req.params.gamePrimaryName]) {
                    res.json({
                        res: true
                    })
                } else {
                    res.json({
                        res: false
                    })
                }


            } catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });

        app.get("/create-game/:gamePrimaryName/:containerRef", async (req, res) => {
            try {
                await this._createGame(req.params.gamePrimaryName, req.params.containerRef)

                res.sendStatus(200);
            } catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });

        app.get("/destroy-game/:gamePrimaryName", (req, res) => {
            try {
                this._destroyGame(req.params.gamePrimaryName)

                res.sendStatus(200);
            } catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
        });

    }

    private _initWebsocket() {

        var proxyServer = http.createServer((req, res) => {
            //proxy.web(req, res);
        });

        //
        // Listen to the `upgrade` event and proxy the
        // WebSocket requests as well.
        //
        proxyServer.on('upgrade', (req, socket, head) => {
            console.log(`upgrade, url:`, req.url);

            var gamePrimary = req.url?.split("/").join("");

            if (!gamePrimary) {
                console.log(`This url does not seem to have a gamePrimaryName: ${req.url}`);
                return;
            }

            var container = this._containers[gamePrimary];

            if (!container) {
                console.log(`No container found for ${gamePrimary}`);
                for (const key in this._containers) {
                    console.log(`Container key:${key}`)
                }
                return;
            }

            console.log(`proxying gamePrimary:${gamePrimary} to ${container.wsPort}`)

            container.proxy.ws(req, socket, head);
        });

        console.log(`Starting proxy ${this._wsProxyPort}`)

        proxyServer.listen(this._wsProxyPort);

    }

    private async _createGame(gamePrimaryName: string, sourceRef: string) {
        try {

            console.log(`createGame called. gamePrimaryName:${gamePrimaryName}, sourceRef: ${sourceRef}`);

            var nextPort = await this.getNextPort();

            var storage = new azStorage();

            await storage.downloadBESource(sourceRef, gamePrimaryName);

            if (!this._containers[gamePrimaryName]) {
                this._containers[gamePrimaryName] = new GameContainer(nextPort, `/usersource/${gamePrimaryName}`);
            }



            await this._containers[gamePrimaryName]?.create();

        } catch (ex: any) {
            console.log(ex);
            //this._client.trackException({ exception: ex });
        }
    }

    private _destroyGame(gamePrimaryName: string) {

        console.log(`destroyGame called, gamePrimaryName:${gamePrimaryName}`);
        this._containers[gamePrimaryName]?.destroy();

        for (const connectionId in this._connectionGame) {
            if (Object.prototype.hasOwnProperty.call(this._connectionGame, connectionId)) {
                const gamePrimaryName = this._connectionGame[connectionId];

                if (gamePrimaryName == gamePrimaryName) {
                    var socket = this._connections[connectionId];

                    console.log(`Sending GameExit to connectionId:${connectionId}`)

                    socket?.send(JSON.stringify(<ISocketConnectedDocument>{ topic: Topic.gameEnd }));
                }
            }
        }
    }

    private async getNextPort(): Promise<number>{

        while(await this.isPortInUse(this._nextWsPort)){
            this._nextWsPort++;
        }

        return this._nextWsPort;
    }

    private async isPortInUse(port: number): Promise<boolean> {

        return await new Promise<boolean>(resolve => {
            var server = net.createServer(function (socket) {
                socket.write('Echo server\r\n');
                socket.pipe(socket);
            });

            server.on('error', function () {
                console.log(`Port ${port} is free!`);
                resolve(true);
            });
            server.on('listening', function () {
                console.log(`Port ${port} in use`);
                server.close();
                resolve(false);
            });

            server.listen(port, '127.0.0.1');
        });

    };
}