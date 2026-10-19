import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { PinDialogComponent } from './pin-dialog.component';

describe('PinDialogComponent', () => {
  let component: PinDialogComponent;
  let fixture: ComponentFixture<PinDialogComponent>;

  const dialogRefMock = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PinDialogComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pin: '12345678' } },
        { provide: MatDialogRef, useValue: dialogRefMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PinDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the PIN in two groups of four', () => {
    const groups = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.pin-value span'),
    ).map((group) => group.textContent);

    expect(groups).toEqual(['1234', '5678']);
  });

  it('keeps Continue disabled until the person confirms they saved the PIN', () => {
    const continueButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-ink');

    expect(continueButton.disabled).toBeTrue();

    component['confirmed'].set(true);
    fixture.detectChanges();

    expect(continueButton.disabled).toBeFalse();
  });
});
