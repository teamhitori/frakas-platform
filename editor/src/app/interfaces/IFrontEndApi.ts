import { Observable } from 'rxjs';

export interface IFrontEndApi {
  sendToBackend(state: any): void;
  onPrivateEvent(): Observable<any>;
  onPublicEvent(): Observable<any>;
  onGameStop(): Observable<any>;
}
