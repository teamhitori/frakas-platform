import { Component, OnInit } from '@angular/core';

@Component({
  templateUrl: './dialog-new-file.component.html',
  styleUrls: ['./dialog-new-file.component.scss']
})
export class DialogNewFileComponent implements OnInit {

  public fileName: string = "";

  constructor() { }

  ngOnInit(): void {
  }

}
