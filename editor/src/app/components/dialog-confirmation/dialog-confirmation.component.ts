import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  templateUrl: './dialog-confirmation.component.html',
  styleUrls: ['./dialog-confirmation.component.scss']
})
export class DialogConfirmationComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<DialogConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

  onAffirmClick(): void {
    this.data.isAffirm = true;
    this.dialogRef.close(this.data);
  }

  ngOnInit(): void {
  }

}

export interface DialogData {
  message: string;
  isAffirm: boolean;
}
