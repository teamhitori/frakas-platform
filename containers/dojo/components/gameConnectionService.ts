import * as appInsights from 'applicationinsights';
import express from 'express';
import * as httpProxy from 'http-proxy';
import * as http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { AzStorage } from './AzStorage';
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
        
          console.log(`Starting proxy ${this._wsProxyPort}`)
          
          proxyServer.listen(this._wsProxyPort);

    }

    private async _createGame(gamePrimaryName: string, sourceRef: string) {
        try {

            console.log(`createGame called. gamePrimaryName:${gamePrimaryName}`);

            var azStorage = new AzStorage();

            var containerName = "reubenh-default-be";
            await azStorage.downloadBESource(sourceRef, gamePrimaryName);

            if (!this._containers[gamePrimaryName]) {
                this._containers[gamePrimaryName] = new GameContainer(this._nextWsPort, `/usersource/${gamePrimaryName}`);
            }

            this._nextWsPort++;

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
}