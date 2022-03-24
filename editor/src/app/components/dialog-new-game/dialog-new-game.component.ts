import {Component, OnInit, Inject} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { HttpService } from 'src/app/services/http.service';

@Component({
  templateUrl: './dialog-new-game.component.html',
  styleUrls: ['./dialog-new-game.component.scss']
})
export class DialogNewGameComponent {

  public newGameName: string = ""
  public gameNamesList: string[] = [];
  public openPrompt: string = "Game Collection Empty"

  public name: any;

  constructor(private _httpService: HttpService,
    public dialogRef: MatDialogRef<DialogNewGameComponent>) { }

  async ngOnInit(): Promise<void> {

    this.gameNamesList = await this._httpService.getGameNames();

    if(this.gameNamesList.length){
      this.openPrompt = "Open Existing";
    }
  }

  onChange(event: MatSelectChange){
    this.newGameName = event.value
    this.dialogRef.close(event.value);
    ;
  }
}
