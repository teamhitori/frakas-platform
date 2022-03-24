import { EventEmitter }  from '@angular/core';
import { Environment } from 'monaco-editor';
import { window } from 'rxjs/operators';
import { IGameApiProvider, IGameWindow } from "../interfaces/IGameWindow";

declare global {
  interface Window {
    gameApiProvider: IGameApiProvider,
    gameWindow: IGameWindow,
    MonacoEnvironment?: Environment | undefined,
    setUpFrame: any
  }
}

export {};

