import { Injectable } from '@angular/core';
import { EMPTY, Observable, Subject } from 'rxjs';
import { GameServiceClient } from '../protos/gameService_grpc_web_pb';
import { ConnectedPlayerDocument, Document } from '../protos/gameService_pb'
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GrpcService {

  private _client: GameServiceClient;
  private _connectionId?: string;
  private _gamePrimaryName?: string;

  constructor() {
    this._client = new GameServiceClient(`${environment.grpcBase}`,
      null, null);

      var request = new Document();
      request.setContent("Hello");
      this._client.ping(request, {}, (err, response) => {
        if (err) {
          console.log(`Unexpected error for ping: code = ${err.code}` +
            `, message = "${err.message}"`);
        } else {
          console.log(response.getContent());
        }
      });
  }

  public enterGame(): Observable<any> {

    var request = new Document();
    var subject = new Subject();

    request.setGameprimaryname(this._gamePrimaryName!!);

    this._client.playerEnter(request, {}, (err, response) => {
      if (err) {
        console.log(`Unexpected error for playerEnter: code = ${err.code}` +
          `, message = "${err.message}"`);
      } else {
        this._connectionId = response.getConnectionid();
        console.log(`ConnectionId: ${this._connectionId}`);

        this._onPlayerEvent(this._connectionId)
          .subscribe(
            next => {
              subject.next(next);
            },
            err => {
              subject.error(err);
            }, () => {
              subject.complete();
            })

      }
    });

    return subject;
  }

  public playerEvent(data: any) {
    if (!this._connectionId || !this._gamePrimaryName) {
      console.log(`Player not connected - cannot send event`);
      return;
    }
    var request = new ConnectedPlayerDocument();
    request.setContent(JSON.stringify(data));
    request.setConnectionid(this._connectionId);
    request.setGameprimaryname(this._gamePrimaryName!!);

    this._client.playerEventIn(request, {}, (err, response) => {
      if (err) {
        console.log(`Unexpected error for playerEvent: code = ${err.code}` +
          `, message = "${err.message}"`);
      } else {
        console.log(response.getContent());
      }
    });
  }

  public startGame(gamePrimaryName: string): Observable<any> {
    this._gamePrimaryName = gamePrimaryName;
    var subject = new Subject();
    var request = new Document();
    request.setGameprimaryname(gamePrimaryName)
    var stream = this._client.startGame(request);
    stream.on('data', function (response) {
      var content = response.getContent();
      //console.log(content);
      subject.next(content);
    });
    stream.on('status', function (status) {
      console.log(status.code);
      console.log(status.details);
      console.log(status.metadata);
    });
    stream.on('end', function () {
      stream.cancel();
      subject.complete();
    });

    return subject;
  }

  public onMetrics(): Observable<any> {

    var subject = new Subject();
    var request = new Document();
    request.setGameprimaryname(this._gamePrimaryName!!)
    var stream = this._client.startMetrics(request);
    stream.on('data', function (response) {
      var content = response.getContent();
      //console.log(content);
      subject.next(content);
    });
    stream.on('status', function (status) {
      console.log(status.code);
      console.log(status.details);
      console.log(status.metadata);
    });
    stream.on('end', function () {
      stream.cancel();
      subject.complete();
    });

    return subject;
  }

  private _onPlayerEvent(connectionId: string): Observable<any> {
    var subject = new Subject();
    var request = new ConnectedPlayerDocument();
    request.setConnectionid(connectionId);
    request.setGameprimaryname(this._gamePrimaryName!!);
    var stream = this._client.playerEventOut(request);
    stream.on('data', function (response) {
      var content = response.getContent();
      //console.log(content);
      subject.next(content);
    });
    stream.on('status', function (status) {
      console.log(status.code);
      console.log(status.details);
      console.log(status.metadata);
    });
    stream.on('end', function () {
      stream.cancel();
      subject.complete();
    });

    return subject;
  }
}
