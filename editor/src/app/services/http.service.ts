import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { last, map, tap } from 'rxjs/operators';
import { ICreateGameInDef } from '../documents/ICreateGameInDef'
import { ICreateGameOutDef } from '../documents/ICreateGameOutDef'
import { IPlayerEventWrapper } from '../documents/IPlayerEventWrapper';
import { IGameConfig } from '../documents/IGameConfig';
import { IDebugDef, RunMode } from '../documents/DebugDef';
import { LogicType } from '../documents/LogicType';
import { IGameLogic } from '../documents/IGameLogic';
import { IGameDefinition } from '../documents/IGameDefinition';
import { environment } from '../../environments/environment';
import { IGameInstance } from '../documents/IGameInstance';
import { IGameInstanceSource } from '../documents/IGameInstanceSource';
import { IPublishedDefinition } from '../documents/IPublishedDefinition';
import { ICodeFile } from '../documents/ICodeFile';
import { FileUpload } from '../documents/FileUpload';


@Injectable({
  providedIn: 'root'
})
export class HttpService {

  //public functionBase: string = "https://localhost:1049";
  //public functionBase: string = "http://localhost:8000";
  //public functionBase: string = "https://teamhitori-mulplay-dev-webapp.azurewebsites.net";

  private _fileUploadSubject: Subject<FileUpload> = new Subject();

  public uploadProgress: { [name: string]: number } = {};

  constructor(
    private http: HttpClient
  ) {
    console.log(`Is prod: ${environment.production}`);

    this._fileUploadSubject
      .subscribe(file => {
        this._addUploadImageBinary(file);
      })
  }

  public async getGameAssets(gameName: string): Promise<string[]> {
    console.log(`Called getGameNames`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-assets/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <string[]>res;
        })
      ).toPromise();
  }



  public async uploadFiles(gameLocation: string, eSaSToken: string, fileList: FileList): Promise<void> {

    //var files: Array<File> = new Array();

    const reader = new FileReader();

    for (var index = 0; index < fileList.length; ++index) {
      var currentFile = fileList.item(index);
      await new Promise((resolve, reject) => {

        reader.addEventListener('load', (event: any) => {

          var localImgUnc = event.target.result;

          this._fileUploadSubject.next(<FileUpload>{
            eSaSToken: eSaSToken,
            file: currentFile,
            gameLocation: gameLocation
          });

          resolve({});

        });

        reader.readAsDataURL(currentFile!!);

      });
    }
  }

  private async _addUploadImageBinary(
    fileUpload: FileUpload): Promise<void> {

    var retObservable = new Subject<string>();
    var fileName = fileUpload.file.name;
    var type = fileUpload.file.type;

    this.uploadProgress[fileName] = 0;

    const headers = new HttpHeaders()
      .set('Content-Type', type)
      .set('x-ms-blob-type', 'BlockBlob');

    //var buffer = await file.arrayBuffer()
    // const imgHash = await cryptohash.sha256(buffer)

    //const req = new HttpRequest('POST', 'api/image', JSON.stringify(imageStr), { headers: headers, reportProgress: true });

    console.log(`upload: ${environment.storageBase}/${fileUpload.gameLocation}/${fileName}`);

    const req2 = new HttpRequest(
      'PUT',
      `${environment.storageBase}/${fileUpload.gameLocation}/${fileName}${fileUpload.eSaSToken}`,
      fileUpload.file,
      { headers: headers, reportProgress: true });

    return this.http.request(req2).pipe(
      tap(event => {
        switch (event.type) {
          case HttpEventType.Sent:
            console.log(`Uploading file.`);
            break;
          case HttpEventType.UploadProgress:
            // Compute and show the % done:
            const percentDone = Math.round(100 * event.loaded / (event.total || 1000000));
            console.log(`File is ${percentDone}% uploaded.`);
            this.uploadProgress[fileName] = percentDone;
            break;
          case HttpEventType.Response:
            console.log(`File was completely uploaded!`);
            delete this.uploadProgress[fileName]
            break;
          default:
            console.log(`File surprising upload event: ${event.type}.`);
            delete this.uploadProgress[fileName]
        }
      }),
      last(),
      map(x => { return; })
    ).toPromise()

  }


  public async upsertGameConfig(gameName: string, gameConfig: IGameConfig): Promise<void> {
    console.log(`Called upsertGameConfig`);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = JSON.stringify(gameConfig);

    return this.http
      .post(`${environment.apiBase}/api/editorApi/upsert-config/${gameName}`, body, { headers: headers })
      .pipe(
        map(() => {
        })
      ).toPromise();
  }

  public async upsertCode(codeFiles: ICodeFile[]): Promise<void> {
    console.log(`Called upsertCode`);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = JSON.stringify(codeFiles);

    return this.http
      .post(`${environment.apiBase}/api/editorApi/upsert-code`, body, { headers: headers })
      .pipe(
        map(() => {
        })
      ).toPromise();
  }

  // public async upsertGameLogic(gameLogic: IGameLogic): Promise<void> {
  //   console.log(`Called upsertGameLogic`);
  //   const headers = new HttpHeaders().set('Content-Type', 'application/json');
  //   const body = JSON.stringify(gameLogic);

  //   return this.http
  //     .post(`${environment.apiBase}/api/editorApi/upsert-logic`, body, { headers: headers })
  //     .pipe(
  //       map(() => {
  //       })
  //     ).toPromise();
  // }

  public async getGameNames(): Promise<string[]> {
    console.log(`Called getGameNames`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-all`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <string[]>res;
        })
      ).toPromise();
  }

  public async getActiveGameList(gameName: string): Promise<IGameInstance[]> {
    console.log(`Called getActiveGameList`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-active/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return res;
        })
      ).toPromise();
  }

  public async createGame(gameName: string): Promise<IGameInstanceSource> {
    console.log(`Called createGame`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/create-game/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return res;
        })
      ).toPromise();
  }

  public async destroyGame(gamePrimaryName: string): Promise<string> {
    console.log(`Called destroyGame`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/destroy-game/${gamePrimaryName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return res;
        })
      ).toPromise();
  }

  public async getPublishedGamePN(gameName: string): Promise<string> {
    console.log(`Called getGameConfig`);

    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = JSON.stringify("");

    return this.http
      .post(`${environment.apiBase}/api/editorApi/get-instance-pn/${gameName}`, body, { headers: headers })
      .pipe(
        map((res: any) => {
          console.log(res);
          return <string>res;
        })
      ).toPromise();
  }

  // public async getPublishedGameInstance(gamePath: string): Promise<IGameInstanceSource> {
  //   console.log(`Called getGameConfig`);

  //   const headers = new HttpHeaders().set('Content-Type', 'application/json');
  //   const body = JSON.stringify("");

  //   return this.http
  //     .post(`${environment.apiBase}${gamePath}`, body, { headers: headers })
  //     .pipe(
  //       map((res: any) => {
  //         console.log(res);
  //         return <IGameInstanceSource>res;
  //       })
  //     ).toPromise();
  // }

  public async getsourceFERef(gameName: string): Promise<string> {
    console.log(`getsourceFERef`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-source-feref/${gameName}`)
      .pipe(
        map((res: any) => {
          //console.log(res);
          return <string>res;
        })
      ).toPromise();
  }

  public async createGameDefinition(gameName: string): Promise<IGameDefinition|undefined> {
    console.log(`createGameDefinition`);

    try {
      return this.http
      .get(`${environment.apiBase}/api/editorApi/create-definition/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <IGameDefinition>res;
        })
      ).toPromise();
    } catch (error) {
      return undefined
    }
  }

  public async getGameDefinition(publishedGameName: string): Promise<IGameDefinition|undefined> {
    console.log(`getGameDefinition`);

    try {
      return this.http
      .get(`${environment.apiBase}/api/editorApi/get-definition/${publishedGameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <IGameDefinition>res;
        })
      ).toPromise();
    } catch (error) {
      return undefined
    }
  }

  public async getGameCode(gameName: string, logicType: LogicType): Promise<IGameLogic> {
    console.log(`Called getGameLogic`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-code/${gameName}/${logicType}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <IGameLogic>res;
        })
      ).toPromise();
  }

  public async getGameConfig(gameName: string): Promise<IGameConfig> {
    console.log(`Called getGameConfig`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-config/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <IGameConfig>res;
        })
      ).toPromise();
  }

  public async publish(gameName: string): Promise<boolean> {
    console.log(`Called publish`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/publish/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <boolean>res;
        })
      ).toPromise();
  }

  public async publishedGameAction(gameName: string, start: boolean, stop: boolean): Promise<boolean> {
    console.log(`Called publish`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/game-action/${gameName}/${start}/${stop}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <boolean>res;
        })
      ).toPromise();
  }


  public async getPublishedDefinition(gameName: string): Promise<IPublishedDefinition> {
    console.log(`Called get-publish-definition`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/get-publish-definition/${gameName}`)
      .pipe(
        map((res: any) => {
          console.log(res);
          return <IPublishedDefinition>res;
        })
      ).toPromise();
  }

  public async enableDebug(gameName: string, enable: Boolean): Promise<void> {
    console.log(`Called enable-debug`);

    return this.http
      .get(`${environment.apiBase}/api/editorApi/enable-debug/${gameName}/${enable}`)
      .pipe(
        map(() => {
        })
      ).toPromise();
  }

  // public async getPublishedUrl(gameName: string): Promise<string> {
  //   console.log(`Called published-url`);

  //   return this.http.get<string>(`${environment.apiBase}/api/editorApi/published-url/${gameName}`).toPromise();
  // }

}
