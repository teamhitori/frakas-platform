import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from './../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SignalrService {

  private _signalrConnection: signalR.HubConnection | undefined;

  constructor() {

    // this._signalrConnection = new signalR.HubConnectionBuilder()
    //   .withUrl(`${environment.apiBase}/game`)
    //   .configureLogging(signalR.LogLevel.Information)
    //   .build();


  }

  async init() {
    console.log('signalr connecting...');

    await this._signalrConnection?.start()
      .catch(console.error);

  }

  onclose(callback: () => void) {
    this._signalrConnection?.onclose(callback);
  }

  invoke(methodName: string, ...args: any[]) {
    this._signalrConnection?.invoke(methodName, ...args);
  }

  on(methodName: string, newMethod: (...args: any[]) => void) {
    this._signalrConnection?.on(methodName, newMethod);
  }

}
