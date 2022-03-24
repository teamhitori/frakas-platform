import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogNewFileComponent } from './dialog-new-file.component';

describe('DialogNewFileComponent', () => {
  let component: DialogNewFileComponent;
  let fixture: ComponentFixture<DialogNewFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogNewFileComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogNewFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
