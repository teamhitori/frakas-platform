import { DOCUMENT } from '@angular/common';
import { Component, Inject, Input, OnInit } from '@angular/core';
import { IGameDefinition } from 'src/app/documents/IGameDefinition';
import { IPublishedDefinition } from 'src/app/documents/IPublishedDefinition';
import { HttpService } from 'src/app/services/http.service';
import { SignalrService } from 'src/app/services/signalr.service';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { environment } from './../../../environments/environment';

@Component({
  selector: 'app-publish-panel',
  templateUrl: './publish-panel.component.html',
  styleUrls: ['./publish-panel.component.scss']
})
export class PublishPanelComponent implements OnInit {

  @Input() gameDefinition!: IGameDefinition;

  @Input() publishedDefinition?: IPublishedDefinition;

  environmentApiBase: string =  environment.apiBase;

  saving: boolean = false;

  private _terminal = new Terminal({
    theme: {
      background: '#000000aa'
    },
    allowTransparency: true
  });
  private _gamePrimaryName?: string;

  constructor(
    @Inject(DOCUMENT) private document: any,
    private _httpService: HttpService,


  ) { }

  async ngOnInit() {

    var doc = document.getElementById('xterm-container2')!!;
    const fitAddon = new FitAddon();
    this._terminal.loadAddon(fitAddon);

    this._terminal.open(doc);

    fitAddon.fit();

    // this._signalrService?.on(`OnMetrics`, (message) => {

    //   var metrics = JSON.parse(message);
    //   for (let metric of metrics) {
    //     for (let logIndex in metric.logs) {
    //       if (metric.logs[logIndex].length) {
    //         this._terminal.writeln(`${logIndex}: `);
    //         for (let inner of metric.logs[logIndex]) {
    //           this._terminal.write(`  `);
    //           for (let inner2 of inner) {
    //             this._terminal.write(`${JSON.stringify(inner2)} `);
    //           }
    //           this._terminal.writeln("");
    //         }
    //       }
    //     }
    //   }
    // });

    // this._signalrService?.on('OnActivePlayerChange', (message) => {
    //   console.log(`Active Players: ${message}`)
    //   this.publishedDefinition!!.activePlayerCount = message
    // })

    this._gamePrimaryName = await this._httpService.getPublishedGamePN(this.gameDefinition.gameName);

    // if(this._gamePrimaryName) {
    //   if(this.gameDefinition!!.debugEnabled) {
    //     await this._signalrService?.invoke("MonitorInstance", this._gamePrimaryName);

    //   }
    // }

    // await this._signalrService?.invoke("MonitorActivePlayers", this.gameDefinition.gameName);
  }

  async publish() {
    var isPublished = await this._httpService.publish(this.gameDefinition.gameName);
    if(isPublished) {
      this.gameDefinition.isPublished = true;
    }
  }

  async unPublish() {
    var isUnPublished = await this._httpService.unPublish(this.gameDefinition.gameName);
    if(isUnPublished) {
      this.gameDefinition.isPublished = false;
    }
  }

  openGame() {
    if(this.publishedDefinition) {
      window?.open(`${environment.apiBase}${this.publishedDefinition.publishedPath}`, '_blank')?.focus();
    }
  }

  async start(){
    await this._httpService.publishedGameAction(this.gameDefinition.gameName, true, false);

    if(this.publishedDefinition) {
      this.publishedDefinition.isStarted = true;
    }

  }

  stop() {
    this._httpService.publishedGameAction(this.gameDefinition.gameName, false, true);

    if(this.publishedDefinition) {
      this.publishedDefinition.isStarted = false;
    }
  }

  restart(){
    this._httpService.publishedGameAction(this.gameDefinition.gameName, true, true);

    if(this.publishedDefinition) {
      this.publishedDefinition.isStarted = true;
    }

  }

  async enableLogs(){

    await this._httpService.enableDebug(this.gameDefinition.gameName, true);

    this.gameDefinition!!.debugEnabled = true;

    if(this._gamePrimaryName) {
      //await this._signalrService?.invoke("MonitorInstance", this._gamePrimaryName);
    }
  }

  async disableLogs(){
    await this._httpService.enableDebug(this.gameDefinition.gameName, false);
    this.gameDefinition!!.debugEnabled = false;
  }

}
