import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { IGameAsset } from 'src/app/documents/IGameAsset';

@Component({
  selector: 'app-assets-panel',
  templateUrl: './assets-panel.component.html',
  styleUrls: ['./assets-panel.component.scss']
})
export class AssetsPanelComponent implements OnInit {

  displayedColumns: string[] = ['img', 'imgName', 'url', 'delete'];

  @Input() public gameAssets: IGameAsset[] = []

  isDrag = false;

  private _fileList: FileList | undefined = undefined;

  @Output() notifyAddImgs: EventEmitter<FileList> = new EventEmitter<FileList>();

  constructor() {

  }

  ngOnInit(): void {
  }

  processFile(event: any) {
    const files = event.srcElement.files;

    this.notifyAddImgs.emit(files);

  }

  dragenter(event: DragEvent) {
    this.isDrag = true;
    event.stopPropagation();
    event.preventDefault();


    if(event.dataTransfer?.files){
      this._fileList = event.dataTransfer?.files;

    } else {
      this._fileList = undefined;
    }
  }

  dragover(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();

  }

  dragleave(event: DragEvent) {
    this.isDrag = false;
    this._fileList = undefined;
    event.stopPropagation();
    event.preventDefault();

  }

  drop(event: DragEvent) {
    this.isDrag = false;
    event.stopPropagation();
    event.preventDefault();


    if (event.dataTransfer?.files) {
      this.notifyAddImgs.emit(event.dataTransfer?.files);
    }
  }

  mouseup(event: Event){
    event.stopPropagation();
    event.preventDefault();

  }
}
