import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideToastr } from 'ngx-toastr';
import { provideLottieOptions } from 'ngx-lottie';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
     {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: {
        timezone: '-0500'
      }
    },
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-top-right',
      timeOut: 4000,
      preventDuplicates: true,
    }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideLottieOptions({
      player: () => import('lottie-web')
    }),
    { provide: LOCALE_ID, useValue: 'es-CO' }, provideAnimationsAsync(),
  ],
};
