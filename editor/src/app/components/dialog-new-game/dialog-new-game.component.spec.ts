import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogNewGameComponent } from './dialog-new-game.component';

describe('DialogNewGameComponent', () => {
  let component: DialogNewGameComponent;
  let fixture: ComponentFixture<DialogNewGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogNewGameComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogNewGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
