import { Component, AfterViewInit, EventEmitter, Output } from '@angular/core';
import * as MurmurHash3 from 'imurmurhash';
import * as monaco from 'monaco-editor';
import { bufferTime } from 'rxjs/operators';
import { IEditorCodeFile } from 'src/app/documents/IEditorCodeFile';


self.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: any, label: string) {
    if (label === 'json') {
      return 'assets/dist/json.worker.bundle.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return 'assets/dist/css.worker.bundle.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return 'assets/dist/html.worker.bundle.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return 'assets/dist/ts.worker.bundle.js'
    }
    return 'assets/dist/editor.worker.bundle.js';
  }
};


@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss']
})
export class MonacoEditorComponent {

  @Output() onFileChange = new EventEmitter();

  public editorKeyEvent: EventEmitter<KeyboardEvent> = new EventEmitter<KeyboardEvent>();
  public noChanges: boolean = true;

  private _file?: IEditorCodeFile;
  private _monacoEditor?: monaco.editor.IStandaloneCodeEditor;
  private _isSet = false;
  private _currentModel?: monaco.editor.ITextModel;

  constructor() { }

  ngAfterViewInit() {
    this.editorKeyEvent
      .pipe(bufferTime(1000))
      .subscribe(keyEvent => {
        if (keyEvent.length && this._file) {
          this.noChanges = true;
          this._file.code = this._currentModel!!.getValue();
          this._file.isDirty = this._file.codeHash != MurmurHash3(this._file.code).result()
          if (this._file.isDirty) {
            this.noChanges = false;
            this.onFileChange.emit();
          }
        }
      });
  }

  async ngAfterViewChecked(): Promise<void> {

    if (!this._isSet) {
      this._isSet = true;
      await new Promise(resolve => setTimeout(resolve, 500));

      var container = document.getElementById('monaco-editor-cont')!!;

      this._monacoEditor = monaco.editor.create(container, {
        value: '',
        language: 'typescript',
        theme: 'vs-dark',

      });

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        "allowNonTsExtensions": true,
        "lib": ["ES6"],
        esModuleInterop: true,
        "moduleResolution": monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
        "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */
      });



      monaco.languages.typescript.typescriptDefaults.addExtraLib(`
        declare module 'src/api' {
          import { Observable } from 'rxjs';

          export interface PlayerEventContent {
              playerPosition: number;
              playerState: any;
          }

          export interface IBackEndApizz {
            sendToPlayer(playerEventContent: PlayerEventContent): void;
            sendToAll(state: any): void;
            onPlayerEvent(): Observable<PlayerEventContent>;
            onGameLoop(): Observable<void>;
            onPlayerEnter(): Observable<number>;
            onPlayerExit(): Observable<number>;
            onGameStop(): Observable<void>;
            onGameStart(): Observable<void>;
          }
        }
        `, `./api/api.ts`);

      monaco.languages.typescript.typescriptDefaults.addExtraLib(`
        declare module 'api' {
          import { Observable } from 'rxjs';

          export interface PlayerEventContent {
              playerPosition: number;
              playerState: any;
          }

          export interface IBackEndApi {
            sendToPlayer(playerEventContent: PlayerEventContent): void;
            sendToAll(state: any): void;
            onPlayerEvent(): Observable<PlayerEventContent>;
            onGameLoop(): Observable<void>;
            onPlayerEnter(): Observable<number>;
            onPlayerExit(): Observable<number>;
            onGameStop(): Observable<void>;
            onGameStart(): Observable<void>;
          }

          export interface IFrontEndApi {
              sendToBackend(state: any): void;
              onPrivateEvent(): Observable<any>;
              onPublicEvent(): Observable<any>;
              onGameStop(): Observable<any>;
          }
        }
        `, `./api.ts`);
    }
  }

  public setFile(file: IEditorCodeFile) {
    this._file = file;

    var split = file.fileName.split(".");
    var fileType = split[split.length - 1].toLocaleLowerCase();

    var modelUri = monaco.Uri.parse(`file://${file.fileName}`);
    var language = fileType == "json" ? "json" :
      fileType == "js" ? "javascript" :
        fileType == "ts" ? "typescript" : "typescript"

    this._currentModel = monaco.editor.getModel(modelUri) ?? monaco.editor.createModel(file.code, language, modelUri);

    this._monacoEditor?.setModel(this._currentModel!!)

  }
}
