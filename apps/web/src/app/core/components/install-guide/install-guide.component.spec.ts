import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { InstallService } from '../../services/install.service';
import { InstallGuideComponent } from './install-guide.component';

describe('InstallGuideComponent', () => {
  let fixture: ComponentFixture<InstallGuideComponent>;

  const dialogRefMock = { close: jasmine.createSpy('close') };
  const installServiceMock = { hideInstallButton: jasmine.createSpy('hideInstallButton') };

  const buttons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));

  beforeEach(async () => {
    dialogRefMock.close.calls.reset();
    installServiceMock.hideInstallButton.calls.reset();

    await TestBed.configureTestingModule({
      imports: [InstallGuideComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: InstallService, useValue: installServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstallGuideComponent);
    fixture.detectChanges();
  });

  it('lists the Home Screen steps in order', () => {
    const steps = fixture.nativeElement.querySelectorAll('ol > li');

    expect(steps.length).toBe(3);
    expect(steps[0].textContent).toContain('INSTALL_GUIDE.STEP_SHARE');
    expect(steps[1].textContent).toContain('INSTALL_GUIDE.STEP_ADD');
    expect(steps[2].textContent).toContain('INSTALL_GUIDE.STEP_CONFIRM');
  });

  it('closes when the person is done reading', () => {
    buttons()[0].click();

    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(installServiceMock.hideInstallButton).not.toHaveBeenCalled();
  });

  it('hides the install button for good and closes', () => {
    buttons()[1].click();

    expect(installServiceMock.hideInstallButton).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});
