import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// import { MonacoEditorModule } from 'ngx-monaco-editor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';

import { EditorComponent } from './components/editor/editor.component';
import { MaterialModule } from './material-module';
//import { GameWindowComponent } from './components/__game-window/game-window.component';
import { DialogNewGameComponent } from './components/dialog-new-game/dialog-new-game.component';
import { PublishPanelComponent } from './components/publish-panel/publish-panel.component';
import { DialogNewFileComponent } from './components/dialog-new-file/dialog-new-file.component';
import { DialogConfirmationComponent } from './components/dialog-confirmation/dialog-confirmation.component';
import { ImageDropComponent } from './components/image-drop/image-drop.component';
import { MonacoEditorComponent } from './components/monaco-editor/monaco-editor.component'

@NgModule({
  declarations: [
    AppComponent,
    EditorComponent,
    //GameWindowComponent,
    DialogNewGameComponent,
    PublishPanelComponent,
    DialogNewFileComponent,
    DialogConfirmationComponent,
    ImageDropComponent,
    MonacoEditorComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    MaterialModule,
    // MonacoEditorModule.forRoot(),
    BrowserAnimationsModule,
    HttpClientModule,
  ],
  providers: []
  //,bootstrap: [AppComponent]
  ,exports: [
    EditorComponent
  ],
  entryComponents: [
    EditorComponent
  ]
})
export class AppModule {
  constructor(private injector: Injector) {
  }

  ngDoBootstrap() {
    customElements.define('editor-component', createCustomElement(EditorComponent,
      { injector: this.injector }));

      // customElements.define('game-component', createCustomElement(GamePanelComponent,
      //   { injector: this.injector }));

    // customElements.define('app-root', createCustomElement(EditorComponent,
    //   { injector: this.injector }));
  }
}
