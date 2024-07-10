import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { tab } from -optionsPage;
} from './tab-options.page';

describe('tab-optionsPage', () => {
  let component: tab-optionsPage;
  let fixture: ComponentFixture<tab-optionsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [tab-optionsPage],
      imports: [IonicModule.forRoot(), ExploreContainerComponentModule]
    }).compileComponents();

    fixture = TestBed.createComponent(tab-optionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
