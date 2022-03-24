import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { Observable } from 'rxjs';
import { bufferTime, delay, map, shareReplay, throttleTime, timeInterval, timeout, timeoutWith, zip } from 'rxjs/operators';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


// import 'monaco-editor/esm/vs/language/typescript/ts.worker.js';
// import 'monaco-editor/esm/vs/language/json/json.worker';
// import 'monaco-editor/esm/vs/language/css/css.worker';
// import 'monaco-editor/esm/vs/language/html/html.worker';

// import * as monaco from "monaco-editor/esm/vs/editor/editor.api";


import { IGameConfig } from 'src/app/documents/IGameConfig';
import { IPlayerEventWrapper } from 'src/app/documents/IPlayerEventWrapper';
import { LogicDefaults } from 'src/app/documents/logicDefaults';
import { HttpService } from 'src/app/services/http.service';
import { PublishPanelComponent } from '../publish-panel/publish-panel.component';
import { IGameApiProvider, IGameWindow } from 'src/app/interfaces/IGameWindow';

import { LogicType } from 'src/app/documents/LogicType';
import { IGameDefinition } from 'src/app/documents/IGameDefinition';
import { IGameLogic } from 'src/app/documents/IGameLogic';
import { ICodeValidation } from 'src/app/documents/ICodeValidation';
import { environment } from './../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { DialogNewGameComponent } from '../dialog-new-game/dialog-new-game.component';
import { IGameInstance } from 'src/app/documents/IGameInstance';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Subject } from 'rxjs/internal/Subject';
import { DOCUMENT } from '@angular/common';
import { SignalrService } from 'src/app/services/signalr.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { IEditorCodeFile } from 'src/app/documents/IEditorCodeFile';
import { ICodeFile } from 'src/app/documents/ICodeFile';
import * as MurmurHash3 from 'imurmurhash';
import { DialogNewFileComponent } from '../dialog-new-file/dialog-new-file.component';
import { ICompilationStatus } from 'src/app/documents/ICompilationStatus';
import { DialogConfirmationComponent } from '../dialog-confirmation/dialog-confirmation.component';
import { IGameAsset } from 'src/app/documents/IGameAsset';
import { MonacoEditorComponent } from '../monaco-editor/monaco-editor.component';


enum EditorScreen {
  debug,
  editor,
  settings,
  publish,
  assets
}

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})

export class EditorComponent {
  title = 'Mul Play Editor';


  @ViewChild('fileEditorWindow') public fileEditorWindow!: MonacoEditorComponent

  @ViewChild('sidenav') public sidenav!: MatSidenav;

  @ViewChild('publishPanel') public publishPanel!: PublishPanelComponent

  public editorOptions = { theme: 'vs-dark', language: 'typescript' };
  public currentFile!: IEditorCodeFile;
  public currentGameDefinition: IGameDefinition = <IGameDefinition>{};
  public selectedGame: String = "";
  public gamesListNames: string[] = [];
  public codeValidation?: ICodeValidation;
  public message: string = "";
  public gameState: any = {};
  public activeGameList: IGameInstance[] = [];
  public screen: EditorScreen = EditorScreen.debug;
  public fullscreen: boolean = false;

  //public fileIsDirty: boolean = false;
  //public gameInstance!: IGameInstance;
  public sourceFERef: string = "";
  public codeFiles: IEditorCodeFile[] = [];


  //private _frontendApi: any;
  //private _connectionId?: string;
  public loadComplete: boolean = false;
  safeSrc!: SafeResourceUrl;
  safeSrcEditor: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${environment.apiBase}/editor-frame`);
  private _currentGamePrimaryName: string = "";


  public get EditorScreen(): typeof EditorScreen {
    return EditorScreen;
  }


  //public currentLogicScreen: LogicType = LogicType.FrontendLogic;
  //public savingLogicScreen: LogicType = LogicType.FrontendLogic;
  // public get LogicType(): typeof LogicType {
  //   return LogicType;
  // }

  public saving = false;
  public showActive = false;
  public loadingActive = false;

  public showLog = false;

  public isHandset$: Observable<boolean> = this._breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches)
    );

  public range = [...Array(1, 50).keys()];

  @ViewChild('codeToggle') codeToggle?: MatButtonToggleGroup;

  //@ViewChild('gameWindow') gameWindow?: GameWindowComponent;

  @ViewChild('debugCantainer') debugCantainer?: ElementRef;



  public noChanges: boolean = true;

  //private _isStepActive: boolean = false;
  //private _breakActive = false;
  //private _lastSavedVersionId: any;
  //public currentGameName!: string;

  private _onPrivateEvent: Subject<any> = new Subject();
  private _onPublicEvent: Subject<any> = new Subject();
  private _onGameStopEvent: Subject<any> = new Subject();

  //private _createGameOutRes: ICreateGameOutDef;
  private _notifyPlayerEvent: EventEmitter<IPlayerEventWrapper> = new EventEmitter<IPlayerEventWrapper>();
  public isGameActive = false;
  private _playerEntered = false;

  //private _signalrConnection?: signalR.HubConnection;
  private _gameWindow?: IGameWindow;

  private _subjectUpdateConfig = new Subject<number>();

  public gameAssets: IGameAsset[] = []

  private _terminal = new Terminal({
    theme: {
      background: '#00000099'
    },

    allowTransparency: true
  });

  //private _setCode?: (language: string, content: string) => void;

  constructor(
    @Inject(DOCUMENT) private document: any,
    private _snackBar: MatSnackBar,
    private _httpService: HttpService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _breakpointObserver: BreakpointObserver,
    private _signalrService: SignalrService,
    //private _grpcService: GrpcService,
    private _websocketService: WebsocketService,
    public dialog: MatDialog,
    public sanitizer: DomSanitizer) {


    window.gameApiProvider = <IGameApiProvider>{
      set: (gameWindow: IGameWindow) => {
        this._gameWindow = gameWindow;
      }
    };

  }


  async ngOnInit() {
    var publishedGameName = (<HTMLInputElement>document.getElementById('config-publishedGameName'))?.value;

    history.pushState({}, "", `editor/${publishedGameName}`);
  }

  async ngAfterViewInit() {

    try {
      this.loadComplete = false;

      await this._initSignalr();
      await this._bindEditorEvents();

      var publishedGameName = (<HTMLInputElement>document.getElementById('config-publishedGameName'))?.value;

      if (publishedGameName) {
        var gameDefinition = await this._httpService.getGameDefinition(publishedGameName);

        if (!gameDefinition) {
          this._snackBar.open(`Seems there was a problem with Game Definition ${publishedGameName}`, 'Ok', {
            duration: 3000
          });

          return;
        }

        await this._setGameDefinition(gameDefinition);
        await this._signalrService?.invoke("MonitorGame", gameDefinition.publishedGameName);

      } else {
        this.showDialogNewGame();
      }

      await this._loadActiveGameList();


      this._notifyPlayerEvent
        .pipe(bufferTime(100))
        .subscribe(playerEvent => {
          if (this.isGameActive && playerEvent.length) {
            this._websocketService?.playerEventIn(playerEvent);
          }
        });

      this.showDebugWindow();

      this._subjectUpdateConfig
        .pipe(
          bufferTime(3000),
        ).subscribe(async events => {
          console.log(`buffer ${events.length}`)

          if (events.length) {

            this.currentGameDefinition.gameConfig.screenRatio = events[events.length - 1];
            await this.upsertCode();
          }
        });


      const fitAddon = new FitAddon();
      this._terminal.loadAddon(fitAddon);

      this._terminal.open(document.getElementById('xterm-container')!!);

      fitAddon.fit();

      this.loadComplete = true;

      var containerEl = document.getElementById('main-container');
      containerEl?.setAttribute('class', 'fade-in');

      this.isHandset$.subscribe(res => {
        if (!res) {
          this.sidenav.open();
        }
      });


    } catch (err) {
      console.log(err);
    }
  }


  onAddImgs(fileList: FileList) {

    var res = this._httpService.uploadFiles(this.currentGameDefinition.storageRoot, this.currentGameDefinition.eSaSToken, fileList);
    console.log("Upload File complete");
  }

  fillScreenChange(event: MatCheckboxChange) {
    console.log(event);

    this.currentGameDefinition.gameConfig.fillScreen = event.checked;
  }

  screenRatioChange(event: any) {

    if (event.target.value) {

      this._subjectUpdateConfig.next(+event.target.value);
    }

  }

  async showDialogNewFile() {
    const dialogRef = this.dialog.open(DialogNewFileComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(async fileName => {
      console.log(`New File dialog was closed ${fileName}`);

      if (fileName) {

        var file = <IEditorCodeFile>{
          code: "",
          codeHash: MurmurHash3("").result(),
          currentError: "",
          fileName: fileName,
          gameName: this.currentGameDefinition.gameName,
          isDirty: true,
          isValidSyntax: true
        }

        this.noChanges = false;

        this.codeFiles.push(file);

        this.codeFiles = this.codeFiles.sort((f1, f2) => f1.fileName.localeCompare(f2.fileName));

        this.currentGameDefinition.gameConfig.codeFileNames = this.codeFiles.map(f => f.fileName);

        this.currentFile = file;
      }
    });
  }

  deletetFile(file: IEditorCodeFile) {
    const dialogRef = this.dialog.open(DialogConfirmationComponent, {
      data: { message: `Delete file ${file.fileName}(.ts)?`, isAffirm: false },
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(`The confirm dialog was closed with result ${result.isAffirm}`);

      if (result.isAffirm) {

        this.codeFiles = this.codeFiles.filter(f => f.fileName != file.fileName);

        this.currentGameDefinition.gameConfig.codeFileNames = this.codeFiles.map(f => f.fileName);

        this.noChanges = false;
      }

    });
  }

  onFileChange() {

    this.noChanges = false;

  }

  selectFile(file: IEditorCodeFile) {
    this.currentFile = file;

    this.fileEditorWindow?.setFile(file);

    //this._setCode?.("typescript", file.code);
    //this.initMonaco();
  }

  getFileColor(file: IEditorCodeFile): string {
    return file.fileName == this.currentFile?.fileName ?
      file.isDirty ? "light-accent" : "light" :
      file.isDirty ? "accent" : "";
  }

  async showDialogNewGame() {
    const dialogRef = this.dialog.open(DialogNewGameComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(async newGameName => {
      console.log(`New Game dialog was closed ${newGameName}`);

      if (newGameName) {

        var isReload = await this._newGameDefinition(newGameName);

        if (isReload) {
          //this.currentGameName = newGameName;
          await this._signalrService?.invoke("MonitorGame", this.currentGameDefinition.publishedGameName);
        }
      }

    });
  }

  async _newGameDefinition(gameName: string): Promise<boolean> {

    var gameDefinition = await this._httpService.createGameDefinition(gameName);

    if (!gameDefinition) {
      this._snackBar.open(`Seems there was a problem with Game Definition ${gameName}`, 'Ok', {
        duration: 3000
      });

      return false;
    }

    await this._setGameDefinition(gameDefinition);

    await this._loadActiveGameList();

    //this.setLogic();
    this._changeDetectorRef.detectChanges();

    if (this.screen == EditorScreen.debug) {
      //this.gameWindow?.setSourceFE(this.sourceFERef);
    }

    history.pushState({}, "", `editor/${gameDefinition.publishedGameName}`);

    return true
  }

  async refreshActive() {
    this.showActive = true;
    this.loadingActive = true
    await this._loadActiveGameList();
    this.loadingActive = false;

  }

  async onSelectActiveGame(gameInstance: IGameInstance) {
    //this.gameInstance = gameInstance;
    this._currentGamePrimaryName = gameInstance.gamePrimaryName;
    this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(`${environment.apiBase}/${gameInstance.publishedGameName}?gamePrimaryName=${gameInstance.gamePrimaryName}`);
    this.activeGameList = [];
    this.isGameActive = true;

    await this._signalrService?.invoke("MonitorInstance", gameInstance.gamePrimaryName);


    // this._websocketService?.startGame(gameInstance.gamePrimaryName)
    //   .subscribe(
    //     data => {
    //       if (!this._playerEntered) return;
    //       var stateItems = JSON.parse(data)
    //       for (const state of stateItems) {
    //         this._onPublicEvent.next(state)
    //       }
    //     },
    //     err => {

    //     },
    //     () => {
    //       this._onGameStopEvent.next({});

    //       this._gameWindow?.disconnect();
    //       this.isGameActive = false;
    //       this._playerEntered = false;
    //       this._snackBar.open('Game Stopped', 'Ok', {
    //         duration: 3000
    //       });
    //     }
    //   );

    // try {
    //   this._gameWindow?.connect(this._frontendApi);
    // } catch (ex: any) {
    //   this._terminal.writeln(`Exception [Connect]: ${ex.message}`);
    // }

    await this._bindGameEvents();

    this._terminal.writeln("Start Game");
  }

  async showDebugWindow() {
    // var isSaved = this.saveCode();
    // if (!isSaved) {
    //   return;
    // }
    this.screen = EditorScreen.debug;
    this._changeDetectorRef.detectChanges();
    //this.gameWindow?.setSourceFE(this.sourceFERef);
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });

  }

  async showAssetsWindow() {
    this.screen = EditorScreen.assets;
    this._changeDetectorRef.detectChanges();
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });

    var assets = await this._httpService.getGameAssets(this.currentGameDefinition.gameName);

    this.gameAssets = assets.map(asset => {
      return <IGameAsset>{
        imageName: asset,
        imgUrl: `${environment.storageBase}/${this.currentGameDefinition.storageRoot}/${asset}`,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(`${environment.storageBase}/${this.currentGameDefinition.storageRoot}/${asset}`)

      }
    })
  }

  async showEditorWindow() {
    this.stopGame();
    this.screen = EditorScreen.editor;
    this._changeDetectorRef.detectChanges();
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });
  }

  async showSettingsWindow() {
    this.screen = EditorScreen.settings;
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });
  }

  async showPublishWindow() {
    this.screen = EditorScreen.publish;
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });

    this._httpService.getPublishedDefinition(this.currentGameDefinition.gameName).then(publishedDefinition => {
      this.publishPanel.publishedDefinition = publishedDefinition;

    });

    // this._signalrService.on("NotifyPublishedGameEvent", () => {
    //   this._httpService.getPublishedDefinition(this.gameDefinition.gameName).then(publishedDefinition => {
    //     this.publishPanel.publishedDefinition = publishedDefinition;

    //   });
    // });
  }


  private async _loadActiveGameList() {
    this.activeGameList = await this._httpService.getActiveGameList(this.currentGameDefinition.gameName);
  }

  private async _setGameDefinition(gameDefinition: IGameDefinition) {

    this.currentGameDefinition = gameDefinition;
    this.sourceFERef = await this._httpService.getsourceFERef(gameDefinition.gameName);

    this.codeFiles = []
    for (const codeFile of this.currentGameDefinition.codeFiles) {
      this.codeFiles.push(<IEditorCodeFile>{
        changed: false,
        syntaxValid: true,
        code: codeFile.code,
        fileName: codeFile.fileName,
        gameName: codeFile.gameName,
        currentError: "",
        isDirty: false,
        isValidSyntax: true,
        codeHash: MurmurHash3(codeFile.code).result()
      })
    }

    this._terminal.clear();
    this._terminal.writeln(this.currentGameDefinition.prevLogs.replace(/\n/g, "\r\n"));

    this._changeDetectorRef.detectChanges();

    //this.gameWindow?.onResize();

    this._snackBar.open('Game Config Loaded', 'Ok', {
      duration: 3000
    });

    return true;

  }

  async stepGame() {
    //this._isStepActive = true;
    //await this._signalrService?.invoke("Step");
  }

  validateCode(): any {
    try {
      //var func = new Function("require", this.code);
      this.codeValidation = { success: true };
    } catch (ex: any) {
      console.log(ex);
      this.codeValidation = {
        success: false,
        error: ex
      };
    }
  }


  async upsertCode() {

    try {
      //this.gameDefinition.gameConfig.intervalMs = +this.gameDefinition.gameConfig.intervalMs;

      this.validateCode();

      if (this.codeValidation?.success) {
        var codeFiles = []
        for (const file of this.codeFiles) {
          codeFiles.push(<ICodeFile>{
            code: file.code,
            fileName: file.fileName,
            gameName: file.gameName
          })

        }

        this.noChanges = true;

        await this._httpService.upsertCode(codeFiles)

        await this._httpService.upsertGameConfig(this.currentGameDefinition.gameName, this.currentGameDefinition.gameConfig);

        this.gamesListNames = await this._httpService.getGameNames();

        for (const file of this.codeFiles) {
          file.isDirty = false;
          file.codeHash = MurmurHash3(file.code).result()
        }

        this._snackBar.open(`Changes Saved`, 'Ok', {
          duration: 3000
        });

      }
    } catch (err) {
      console.log(err);
    }

    this.saving = false;
  }

  async startGame() {

    if (!this.isGameActive) {
      try {


        var gameSource = await this._httpService.createGame(this.currentGameDefinition.gameName);

        this._currentGamePrimaryName = gameSource.gameInstance.gamePrimaryName;
        this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(`${environment.apiBase}/${gameSource.gameInstance.publishedGameName}?gamePrimaryName=${gameSource.gameInstance.gamePrimaryName}`);

        this.isGameActive = true;

        await this._signalrService?.invoke("MonitorInstance", this._currentGamePrimaryName);

        // this._websocketService?.startGame(this.gameInstance.gamePrimaryName)
        //   .subscribe(
        //     data => {
        //       if (!this._playerEntered) return;
        //       var stateItems = JSON.parse(data)
        //       for (const state of stateItems) {
        //         if (state) {
        //           this._onGameLoopCallback(state);
        //         }
        //       }
        //     },
        //     err => {

        //     },
        //     () => {
        //       this._onGameStopCallback({});

        //       this._gameWindow?.disconnect();
        //       this.isGameActive = false;
        //       this._playerEntered = false;
        //       this._snackBar.open('Game Stopped', 'Ok', {
        //         duration: 3000
        //       });
        //     }
        //   );

        // this._gameWindow?.connect(this._frontendApi);
        await this._bindGameEvents();

        this._terminal.writeln("Start Game");
      } catch (ex: any) {
        console.log(`Exception [Connect]: ${ex.message}`);
        this.isGameActive = false;
        this._playerEntered = false;
        this._snackBar.open('Game Stopped', 'Ok', {
          duration: 3000
        });
      }
    }
  }

  async stopGame() {

    await this.finalizeGameLoop();
  }

  expand() {
    this.sidenav.close();

    this.fullscreen = true;

    var header = document.getElementById("nav-bar");
    header?.classList.add('collapse-header');

    this.openFullscreen()

    // setTimeout(() => {
    //   this.gameWindow?.onResize();
    // }, 500);

    // this.gameWindow?.focusCanvas();
  }

  collapse() {

    this.isHandset$.subscribe(res => {
      if (!res) {
        this.sidenav.open();
      }
    });

    this.fullscreen = false;

    var header = document.getElementById("nav-bar");
    header?.classList.remove('collapse-header');

    this.closeFullscreen();

    // setTimeout(() => {
    //   this.gameWindow?.onResize();
    // }, 500);

    // this.gameWindow?.focusCanvas();
  }

  onKeyDown($event: KeyboardEvent): void {
    // Detect platform
    if (navigator.platform.match('Mac')) {
      this.handleMacKeyEvents($event);
    }
    else {
      this.handleWindowsKeyEvents($event);
    }
  }

  handleMacKeyEvents($event: KeyboardEvent) {
    // MetaKey documentation
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.metaKey && charCode === 's') {
      // Action on Cmd + S
      $event.preventDefault();
    }
  }

  handleWindowsKeyEvents($event: KeyboardEvent) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.ctrlKey && charCode === 's') {
      // Action on Ctrl + S
      $event.preventDefault();
    }
  }

  async saveCode(): Promise<boolean> {
    var isDirty = false;
    var isValidSyntax = true;

    for (const file of this.codeFiles) {

      if (file.isDirty) {
        isDirty = true;
      }

      if (!file.isValidSyntax) {
        isValidSyntax = false;
      }
    }

    if (isDirty || !this.noChanges) {
      if (isValidSyntax) {
        await this.upsertCode();
      }
    } else {
      this._snackBar.open('No code Changes', 'Ok', {
        duration: 3000
      });
    }

    return isValidSyntax;

    // if (this.fileIsDirty) {

    //   this.saving = true;
    //   switch (this.currentLogicScreen) {

    //     case LogicType.FrontendLogic:
    //       this.gameDefinition.frontendLogic = this.code;
    //       break;
    //     case LogicType.BackendLogic:
    //       this.gameDefinition.backendLogic = this.code;
    //       break;
    //     default:
    //       break;
    //   }

    //   await this.upsertGameConfig();
    // }

    //this.fileIsDirty = false;
    //this.savingLogicScreen = nextScreen;

  }

  async initMonaco() {

    //var monaco = (window as any).monaco;

    //console.log(monaco);

    // monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    //   experimentalDecorators: true,
    //   emitDecoratorMetadata: true,
    //   importHelpers: true,
    //   //noLib: true,
    //   allowNonTsExtensions: true,
    //   lib: ["dom", "ES6"],
    //   target: monaco.languages.typescript.ScriptTarget.ESNext,
    // });


    // // validation settings
    // monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    //   noSemanticValidation: false,
    //   noSyntaxValidation: false
    // });

    // compiler options
    // monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    //   "target": monaco.languages.typescript.ScriptTarget.ES6,
    //   "allowNonTsExtensions": true,
    //   "module": "commonjs",
    //   "lib": ["ES6"],
    //   "moduleResolution": "node",
    //   "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
    //   "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */


    // });


    // var response = await fetch("https://preview.babylonjs.com/babylon.d.ts");
    // var babylonDef = await response.text();

    // response = await fetch("https://raw.githubusercontent.com/microsoft/tslib/main/tslib.d.ts");
    // var tsLib = await response.text();

    // var lib = "export interface IFrontendApi { playerEvent(state: any): void; }";

    // const uri = monaco.Uri.file("babylon.d.ts");
    // monaco.languages.typescript.typescriptDefaults.addExtraLib(babylonDef, uri.toString());
    // monaco.editor.getModels()[0] ?? monaco.editor.createModel(lib, "typescript", uri);

    // monaco.languages.typescript.typescriptDefaults.addExtraLib(`
    // import { Observable } from 'rxjs';
    // export interface PlayerEventContent {
    //     playerPosition: number;
    //     playerState: any;
    // }
    // export interface IBackEndApi {
    //   sendToPlayer(playerEventContent: PlayerEventContent): void;
    //   sendToAll(state: any): void;
    //   onPlayerEvent(): Observable<PlayerEventContent>;
    //   onGameLoop(): Observable<void>;
    //   onPlayerEnter(): Observable<number>;
    //   onPlayerExit(): Observable<number>;
    //   onGameStop(): Observable<void>;
    //   onGameStart(): Observable<void>;
    // }
    // export interface IFrontEndApi {
    //     sendToBackend(state: any): void;
    //     onPrivateEvent(): Observable<any>;
    //     onPublicEvent(): Observable<any>;
    //     onGameStop(): Observable<any>;
    // }`, "api");

    // const uri1 = monaco.Uri.file("IGameWindows.ts");
    // monaco.languages.typescript.typescriptDefaults.addExtraLib(`
    // import { IFrontEndApi } from './api'
    // export interface IGameWindow {
    //   connect(frontendApi: IFrontEndApi): void
    //   disconnect(): void;
    // }
    // export interface IGameApiProvider {
    //   set(gameWindow: IGameWindow): void
    // }`, uri1.toString());
    // monaco.editor.createModel(lib, "typescript", uri1);

    // const uri2 = monaco.Uri.file("global.gameWindow.d.ts");
    // monaco.languages.typescript.typescriptDefaults.addExtraLib(`
    // import { IGameApiProvider } from "./IGameWindow";
    // declare global {
    //   interface Window { gameApiProvider: IGameApiProvider  }
    // }`, uri2.toString());
    // monaco.editor.createModel(lib, "typescript", uri2);


    // for (const file of this.codeFiles) {
    //   console.log(`Adding module: ${file.fileName}.ts`)
    //   const uri = monaco.Uri.file(`${file.fileName}.ts`);
    //   monaco.languages.typescript.typescriptDefaults.addExtraLib(file.code, uri.toString());
    //   //monaco.editor.createModel(lib, "typescript", uri);
    // }


    //monaco.languages.typescript.javascriptDefaults.addExtraLib("export interface game {}", "game.ts",)


    //monaco.languages.typescript.javascriptDefaults.addExtraLib();
    // monaco.languages.typescript.typescriptDefaults.addExtraLib([
    //   ` declare interface IFrontendApi {
    //       playerEvent(state: any): void;
    //       onPlayerEvent(callback: (state: any) => void): void;
    //       onGameLoop(callback: (state: any) => void): void;
    //       onGameStop(callback: (state: any) => void): void;
    //     }
    //     var frontendApi: IFrontendApi;
    //   `, `declare interface IBackendApi {
    //       pushPlayerState(playerPosition: number, state: any): void;
    //       pushGameState(state: any): void;
    //       onPlayerEvent(callback: (playerPosition: number, playerState: any) => void): void;
    //       onGameLoop(callback: () => void): void;
    //       onPlayerEnter(callback: (playerPosition: number) => void): void;
    //       onPlayerExit(callback: (playerPosition: number) => void): void;
    //       onGameStop(callback: () => void): void;
    //       onGameStart(callback: () => void): void;
    //     };
    //     var backendApi: IBackendApi;
    //   `, `declare interface IGameConfig {
    //       intervalMs: number;
    //       fillScreen: boolean;
    //       screenRatio: number;
    //     }
    //     var gameConfig: IGameConfig;

    //   `
    // ].join('\n'), 'game.ts');

    //var model = editor.getModel();

    //console.log(model)

    // model.onDidChangeContent(() => {
    //   var currentId = model.getAlternativeVersionId();

    //   this.currentFile.isDirty = this.currentFile.codeHash != MurmurHash3(this.currentFile.code).result()


    // });

    // var decorations = editor.deltaDecorations([], [
    //   {
    //     range: new monaco.Range(3, 1, 3, 1),
    //     options: {
    //       isWholeLine: true,
    //       className: 'myContentClass',
    //     }
    //   }
    // ]);

    // editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    //   this.saveCode();
    // })

    // let line = editor.getPosition();
    // console.log(line);



    // var el = document.getElementById('monaco-editor-cont')!!

    // self.MonacoEnvironment = {
    //   getWorkerUrl: function (_moduleId: any, label: string) {
    //     if (label === 'json') {
    //       return './json.worker.bundle.js';
    //     }
    //     if (label === 'css' || label === 'scss' || label === 'less') {
    //       return './css.worker.bundle.js';
    //     }
    //     if (label === 'html' || label === 'handlebars' || label === 'razor') {
    //       return './html.worker.bundle.js';
    //     }
    //     if (label === 'typescript' || label === 'javascript') {
    //       return './ts.worker.bundle.js';
    //     }
    //     return './editor.worker.bundle.js';
    //   }
    // };

    // monaco.editor.create(el, {
    //   value: this.currentFile.code,
    //   language: 'typescript'
    // });

  }


  openFullscreen() {
    if (this.debugCantainer?.nativeElement.requestFullscreen) {
      this.debugCantainer?.nativeElement.requestFullscreen();
    } else if (this.debugCantainer?.nativeElement.mozRequestFullScreen) {
      /* Firefox */
      this.debugCantainer.nativeElement.mozRequestFullScreen();
    } else if (this.debugCantainer?.nativeElement.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      this.debugCantainer?.nativeElement.webkitRequestFullscreen();
    } else if (this.debugCantainer?.nativeElement.msRequestFullscreen) {
      /* IE/Edge */
      this.debugCantainer?.nativeElement.msRequestFullscreen();
    }
  }

  /* Close fullscreen */
  closeFullscreen() {
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen();
    } else if (this.document.mozCancelFullScreen) {
      /* Firefox */
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      /* IE/Edge */
      this.document.msExitFullscreen();
    }
  }

  private async finalizeGameLoop() {

    this.isGameActive = false;

    //await this._signalrService?.invoke("Stop", this.gameInstance.gamePrimaryName);

    if (this._currentGamePrimaryName) {
      await this._httpService.destroyGame(this._currentGamePrimaryName);
    }




    this._gameWindow?.disconnect();
  }


  private async _initSignalr() {

    await this._signalrService.init();

    this._signalrService.onclose(() => {

      console.log('disconnected');
      this.isGameActive = false;
      this._gameWindow?.disconnect();
    });
  }

  private async _bindGameEvents() {

    this._signalrService?.on(`OnMetrics`, (message) => {

      var metrics = JSON.parse(message);
      for (let metric of metrics) {
        for (let logIndex in metric.logs) {
          if (metric.logs[logIndex].length) {
            this._terminal.writeln(`${logIndex}: `);
            for (let inner of metric.logs[logIndex]) {
              this._terminal.write(`  `);
              for (let inner2 of inner) {
                this._terminal.write(`${JSON.stringify(inner2)} `);
              }
              this._terminal.writeln("");
            }
          }
        }
      }
    });
  }

  private async _bindEditorEvents() {
    this._signalrService?.on(`OnNotifyReload`, (message) => {
      if (!this.isGameActive) {
        this._newGameDefinition(this.currentGameDefinition.gameName);
      }
    });

    this._signalrService?.on(`OnNotifyCompilation`, (message) => {
      this.showLog = true;
      console.log(message);
      var status = <ICompilationStatus>message;
      if (status.isComplete) {
        this._snackBar.open('Compilation Complete', 'Ok', {
          duration: 3000
        });
        this.sourceFERef = status.urlFE;
        //this.gameWindow?.setGameWindowSource(status.source);

        this._terminal.clear();
        this._terminal.writeln(status.log.replace(/\n/g, "\r\n"));

      } else {
        console.log("hmmm")
      }
    });
  }
}

