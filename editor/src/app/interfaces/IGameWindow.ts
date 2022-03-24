import { IFrontEndApi } from "./IFrontEndApi";


export interface IGameWindow {
  connect(frontendApi: IFrontEndApi): void
  disconnect(): void;
}

export interface IGameApiProvider {
  set(gameWindow: IGameWindow): void
}
