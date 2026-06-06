import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Company, Recipient, NewsArticle, Stats, RunLog, UserOverride, Configuration } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  health(): Observable<{ ok: boolean; time: string; company: string; model: string }> {
    return this.http.get<{ ok: boolean; time: string; company: string; model: string }>(`${this.base}/health`);
  }

  listCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.base}/companies`);
  }
  createCompany(c: Partial<Company>): Observable<Company> {
    return this.http.post<Company>(`${this.base}/companies`, c);
  }
  updateCompany(id: string, c: Partial<Company>): Observable<Company> {
    return this.http.put<Company>(`${this.base}/companies/${id}`, c);
  }
  deleteCompany(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/companies/${id}`);
  }

  listRecipients(): Observable<Recipient[]> {
    return this.http.get<Recipient[]>(`${this.base}/recipients`);
  }
  createRecipient(r: Partial<Recipient>): Observable<Recipient> {
    return this.http.post<Recipient>(`${this.base}/recipients`, r);
  }
  updateRecipient(id: string, r: Partial<Recipient>): Observable<Recipient> {
    return this.http.put<Recipient>(`${this.base}/recipients/${id}`, r);
  }
  deleteRecipient(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/recipients/${id}`);
  }
  testEmail(id: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/recipients/${id}/test-email`, {});
  }

  listNews(params: Record<string, string> = {}): Observable<{ items: NewsArticle[]; total: number }> {
    const search = new URLSearchParams(params).toString();
    return this.http.get<{ items: NewsArticle[]; total: number }>(
      `${this.base}/news${search ? '?' + search : ''}`
    );
  }
  newsStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.base}/news/stats`);
  }
  getNews(id: string): Observable<NewsArticle> {
    return this.http.get<NewsArticle>(`${this.base}/news/${id}`);
  }
  deleteNews(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/news/${id}`);
  }
  overrideClassification(id: string, override: Partial<UserOverride>): Observable<NewsArticle> {
    return this.http.patch<NewsArticle>(`${this.base}/news/${id}/override`, override);
  }
  clearOverride(id: string): Observable<NewsArticle> {
    return this.http.delete<NewsArticle>(`${this.base}/news/${id}/override`);
  }

  listRuns(): Observable<RunLog[]> {
    return this.http.get<RunLog[]>(`${this.base}/runs`);
  }
  triggerFetch(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/runs/fetch-now`, {});
  }
  triggerDigest(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/runs/digest-now`, {});
  }

  getConfig(): Observable<Configuration> {
    return this.http.get<Configuration>(`${this.base}/config`);
  }
  updateConfig(cfg: Partial<Configuration>): Observable<Configuration> {
    return this.http.put<Configuration>(`${this.base}/config`, cfg);
  }
  resetConfig(): Observable<Configuration> {
    return this.http.post<Configuration>(`${this.base}/config/reset`, {});
  }
}
