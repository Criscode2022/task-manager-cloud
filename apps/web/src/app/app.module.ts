import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { NgModule, isDevMode } from '@angular/core';
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
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
      }),
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([LoadingInterceptor])),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
