import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import { IGameConfig } from 'src/app/documents/IGameConfig';

@Component({
  selector: 'app-config-panel',
  templateUrl: './config-panel.component.html',
  styleUrls: ['./config-panel.component.scss']
})
export class ConfigPanelComponent implements OnInit {

  @Output() upsertConfig = new EventEmitter();

  private _subjectUpdateConfig = new Subject<number>();

  @Input() gameConfig!: IGameConfig;

  constructor() { }

  ngOnInit(): void {

    this._subjectUpdateConfig
        .pipe(
          bufferTime(3000),
        ).subscribe(async events => {
          console.log(`buffer ${events.length}`)

          if (events.length) {

            this.gameConfig.screenRatio = events[events.length - 1];
            this.upsertConfig.emit();
          }
        });
  }

  fillScreenChange(event: MatCheckboxChange) {
    console.log(event);

    this.gameConfig.fillScreen = event.checked;

    this.upsertConfig.emit();
  }

  screenRatioChange(event: any) {

    if (event.target.value) {

      this._subjectUpdateConfig.next(+event.target.value);
    }

  }
}
