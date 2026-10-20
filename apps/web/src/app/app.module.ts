import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import {
  NgModule,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoadingInterceptor } from './core/interceptors/loading-interceptor';
import { InstallService } from './core/services/install.service';
import { StorageModule } from './storage.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    StorageModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    { provide: LocationStrategy, useClass: PathLocationStrategy },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideZoneChangeDetection(),
    provideAnimationsAsync(),
    // The browser can offer install before the list page loads, so listen from startup.
    provideAppInitializer(() => {
      inject(InstallService);
    }),
    provideHttpClient(withFetch(), withInterceptors([LoadingInterceptor])),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json',
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
