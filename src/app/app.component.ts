import { Component, Inject, OnInit } from '@angular/core';
import { Response } from '@angular/http';

import { AuthService } from './shared/services';
import { Router } from '@angular/router';
import { TranslateService } from 'ng2-translate';
import { ErrorService } from './shared/services/error.service';
import { INotificationService } from './shared/services/notification.service';
import { MdlLayoutComponent } from 'angular2-mdl';

import '../style/app.scss';
import { StorageService } from './shared/services/storage.service';


@Component({
  selector: 'cs-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public loggedIn: boolean;
  public title: string;

  constructor(
    private auth: AuthService,
    private router: Router,
    private translate: TranslateService,
    private error: ErrorService,
    @Inject('INotificationService') private notification: INotificationService,
    private storage: StorageService,
  ) {
    this.title = this.auth.name;
    // this.translate.setDefaultLang('en');
    // this.translate.use('en');
    this.error.subscribe(e => this.handleError(e));
    this.auth.isLoggedIn().subscribe(r => this.loggedIn = r);
    this.auth.loggedIn.subscribe(loggedIn => {
      this.updateAccount(loggedIn);
    });
  }

  public componentSelected(mainLayout: MdlLayoutComponent): void {
    mainLayout.closeDrawerOnSmallScreens();
  }

  public ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.updateAccount(false);
    }
    this.setLanguage();
  }

  // todo: remove
  public changeLanguage(): void {
    let lang = this.storage.read('lang');
    if (lang === 'ru') {
      this.storage.write('lang', 'en');
    }
    if (lang === 'en') {
      this.storage.write('lang', 'ru');
    }
    this.setLanguage();
  }

  public setLanguage(): void {
    let lang = this.storage.read('lang');
    if (!lang) {
      this.storage.write('lang', 'en');
      this.translate.use('en');
      return;
    }
    this.translate.use(lang);
  }

  private updateAccount(loggedIn: boolean): void {
    this.loggedIn = loggedIn;
    if (loggedIn) {
      this.title = this.auth.name;
    } else {
      this.router.navigate(['/login'])
        .then(() => location.reload());
    }
  }

  private handleError(e: any): void {
    if (e instanceof Response) {
      switch (e.status) {
        case 401:
          this.translate.get('NOT_LOGGED_IN').subscribe(result => this.notification.message(result));
          this.auth.setLoggedOut();
          break;
        case 431:
          this.translate.get('WRONG_ARGUMENTS').subscribe(result => this.notification.message(result));
          break;
      }
    } else {
      this.translate.get('UNEXPECTED_ERROR').subscribe(result => this.notification.message(result));
    }
  }
}
