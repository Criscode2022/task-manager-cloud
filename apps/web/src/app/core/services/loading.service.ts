import { Injectable, signal, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingController = inject(LoadingController);
  private router = inject(Router);

  public isLoading = signal(false);
  
  private requestsInProgress = 0;
  private loadingElement: HTMLIonLoadingElement | null = null;
  private isCreatingLoading = false;

  public async showLoading(): Promise<void> {
    this.requestsInProgress++;
    this.isLoading.set(true);

    if (this.requestsInProgress === 1 && !this.loadingElement && !this.isCreatingLoading) {
      if (this.router.url.includes('/tabs/options')) {
        this.isCreatingLoading = true;
        try {
          const loading = await this.loadingController.create({
            spinner: 'crescent',
            message: 'Please wait...',
            translucent: true,
            backdropDismiss: false
          });

          // Check if requests finished while we were creating the element
          if (this.requestsInProgress > 0) {
            this.loadingElement = loading;
            await this.loadingElement.present();
          } else {
            // Immediately dismiss if no longer needed
            await loading.dismiss();
          }
        } finally {
          this.isCreatingLoading = false;
        }
      }
    }
  }

  public async hideLoading(): Promise<void> {
    this.requestsInProgress--;
    
    if (this.requestsInProgress <= 0) {
      this.isLoading.set(false);
      this.requestsInProgress = 0;
      
      if (this.loadingElement) {
        await this.loadingElement.dismiss();
        this.loadingElement = null;
      }
    }
  }
}
