import { Injectable } from '@angular/core';
import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ISocketConnectedDocument } from '../documents/SocketConnectedDocument';
import { ConnectedPlayerDocument, Document } from '../protos/gameService_pb'
import { ISocketDocument } from '../documents/SocketDocument';
import { Topic } from '../documents/Topic';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private _socket: WebSocket | undefined = undefined;
  private _queueEvent: ReplaySubject<ISocketConnectedDocument> = new ReplaySubject();
  //private _socketConnectedDoc: ReplaySubject<ConnectedPlayerDocument> = new ReplaySubject();
  //private _connectionId?: string;
  private _gamePrimaryName?: string;


  private _playerEnterSubject: Subject<ISocketConnectedDocument> = new Subject();
  private _playerEventSubject: Subject<ISocketConnectedDocument> = new Subject();
  private _gameLoopSubject: Subject<ISocketConnectedDocument> = new Subject();
  private _metricsSubject: Subject<ISocketConnectedDocument> = new Subject();

  constructor() {
    try {
      // Create WebSocket connection.
      console.log(`Connecting to: ${environment.socketBase}`);
      //this._socket = new WebSocket(`${environment.socketBase}`);

      // Connection opened
      this._socket?.addEventListener('open', event => {
        this._queueEvent.subscribe(
          request => {
            this._socket?.send(JSON.stringify(request));
          }
        );
      });

      this._queueEvent.next(<ISocketConnectedDocument>{
        topic: Topic.ping,
        content: "Drink!!"
      });

      // Listen for messages
      this._socket?.addEventListener('message', event => {

        var doc = JSON.parse(event.data) as ISocketConnectedDocument;

        //console.log('Message from server ', doc?.topic);

        switch (doc.topic) {
          case Topic.ping:
            console.log(doc);
            break;
          case Topic.playerEnter:
            this._playerEnterSubject.next(doc);
            break;
          case Topic.playerEventOut:
            this._playerEventSubject.next(doc);
            break;
          case Topic.gameLoop:
            this._gameLoopSubject.next(doc);
            break;
          case Topic.metrics:
            this._metricsSubject.next(doc);
            break;
          case Topic.gameEnd:
            this._gameLoopSubject.complete();
            break;
        }
      });
    } catch (ex) {
      console.log(ex);
    }

  }

  public enterGame(): Observable<string> {
    var subject = new Subject<string>();

    // need sychronicity
    setTimeout(async () => {

      this._onPlayerEvent()
        .subscribe(
          message => {
            subject.next(message);
          },
          ex => {
            subject.error(ex);
          },
          () => {
            subject.complete();
          });

      this._queueEvent.next(<ISocketConnectedDocument>{
        topic: Topic.playerEnter,
        gamePrimaryName: this._gamePrimaryName!!
      });

    }, 0);

    return subject;
  }

  public playerEventIn(data: any) {
    if (!this._gamePrimaryName) {
      console.log(`Player not connected - cannot send event`);
      return;
    }

    this._queueEvent.next(<ISocketConnectedDocument>{
      topic: Topic.playerEventIn,
      gamePrimaryName: this._gamePrimaryName!!,
      content: JSON.stringify(data)
    });
  }

  public startGame(gamePrimaryName: string): Observable<string> {
    this._gamePrimaryName = gamePrimaryName;
    var subject = new Subject<string>();
    this._gameLoopSubject = new Subject();

    setTimeout(async () => {

      this._gameLoopSubject
        .pipe(map(event => {
          return event.content
        }))
        .subscribe(
          message => {
            subject.next(message);
          },
          ex => {
            subject.error(ex);
          },
          () => {
            subject.complete();
          });

      this._queueEvent.next(<ISocketConnectedDocument>{
        topic: Topic.startGame,
        gamePrimaryName: this._gamePrimaryName!!
      });

    }, 0);

    return subject;
  }

  public onMetrics(): Observable<string> {

    var subject = new Subject<string>();

    this._metricsSubject
      .pipe(map(event => {
        return event.content
      }))
      .subscribe(
        message => {
          subject.next(message);
        },
        ex => {
          subject.error(ex);
        },
        () => {
          subject.complete();
        });

    return subject;

  }

  private _onPlayerEvent(): Observable<string> {
    if (!this._gamePrimaryName) {
      console.log(`Player not connected - cannot connect to player event`);
      return EMPTY;
    }

    var subject = new Subject<string>();

    setTimeout(async () => {

      this._playerEventSubject
        .pipe(map(event => {
          return event.content
        }))
        .subscribe(
          message => {
            subject.next(message);
          },
          ex => {
            subject.error(ex);
          },
          () => {
            subject.complete();
          });

    }, 0);

    return subject;
  }

}
