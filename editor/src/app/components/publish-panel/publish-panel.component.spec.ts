import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishPanelComponent } from './publish-panel.component';

describe('PublishPanelComponent', () => {
  let component: PublishPanelComponent;
  let fixture: ComponentFixture<PublishPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublishPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublishPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
