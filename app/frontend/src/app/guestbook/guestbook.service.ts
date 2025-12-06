import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { GuestbookData } from './guestbook.component';
import { ConfigService } from '../config.service';

@Injectable({
  providedIn: 'root'
})
export class GuestbookService {

  private config: any;
  constructor(private http: HttpClient, private configService: ConfigService) {
    
  }

  public getGuestbook(): Observable<GuestbookData[]> {
    return new Observable(obs => {
      this.configService.fetchConfig("backend_uri").subscribe(conf => {
        this.http.get<GuestbookData[]>(conf).subscribe(data => obs.next(data))
      })
    }) ;
  }

  public postGuestbook(guestbookData: GuestbookData): Observable < Object > {

    return new Observable(obs => {
      this.configService.fetchConfig("backend_uri").subscribe(conf => {
        this.http.post(conf, guestbookData).subscribe(data => obs.next(data))
      })
    }) ;

  }

  private getBaseUrl(backendUri: string): string {
    // Remove trailing /guestbook if present
    let baseUrl = backendUri.trim();
    
    // Handle relative URLs (starting with . or /)
    if (baseUrl.startsWith('.')) {
      // If it's a relative path, construct absolute URL from current location
      const protocol = window.location.protocol;
      const host = window.location.host;
      baseUrl = protocol + '//' + host + baseUrl.substring(1);
    } else if (baseUrl.startsWith('/')) {
      // If it starts with /, make it relative to current origin
      const protocol = window.location.protocol;
      const host = window.location.host;
      baseUrl = protocol + '//' + host + baseUrl;
    }
    
    if (baseUrl.endsWith('/guestbook')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - '/guestbook'.length);
    }
    // Ensure it ends with /
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    return baseUrl;
  }

  public getVisitingCards(): Observable<any[]> {
    return new Observable(obs => {
      this.configService.fetchConfig("backend_uri").subscribe(conf => {
        const baseUrl = this.getBaseUrl(conf);
        const url = baseUrl + 'visiting-cards';
        this.http.get<any[]>(url).subscribe(data => obs.next(data), err => obs.error(err))
      }, err => obs.error(err))
    });
  }

  public postVisitingCard(formData: FormData): Observable<Object> {
    return new Observable(obs => {
      this.configService.fetchConfig("backend_uri").subscribe(conf => {
        const baseUrl = this.getBaseUrl(conf);
        const url = baseUrl + 'visiting-cards';
        this.http.post(url, formData).subscribe(data => obs.next(data), err => obs.error(err))
      }, err => obs.error(err))
    });
  }


}
