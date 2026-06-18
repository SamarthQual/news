import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { Company, ImpactLevel, NewsArticle, RiskType, UserOverride } from '../models';
import { ActivatedRoute } from '@angular/router';

interface EditState {
  riskType: RiskType;
  riskLevel: ImpactLevel;
  impactLevel: ImpactLevel;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  note: string;
}

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>News Feed</h1>
    <p class="muted">Filter, review, and recalibrate AI classifications. Your corrections train the next batch.</p>

    <div class="card" style="margin-top: 16px;">
      <div class="toolbar">
        <div style="min-width: 200px; flex: 1 1 200px;">
          <input [(ngModel)]="search" (ngModelChange)="reload()" placeholder="Search title..." />
        </div>
        <div style="min-width: 160px; flex: 1 1 160px;">
          <select [(ngModel)]="company" (ngModelChange)="reload()">
            <option value="">All companies</option>
            <option *ngFor="let c of companies" [value]="c._id">{{ c.name }}</option>
          </select>
        </div>
        <div style="min-width: 140px; flex: 1 1 140px;">
          <select [(ngModel)]="impactLevel" (ngModelChange)="reload()">
            <option value="">All impact</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div style="min-width: 140px; flex: 1 1 140px;">
          <select [(ngModel)]="riskType" (ngModelChange)="reload()">
            <option value="">All risk types</option>
            <option value="financial">Financial</option>
            <option value="operational">Operational</option>
            <option value="reputational">Reputational</option>
            <option value="regulatory">Regulatory</option>
            <option value="competitive">Competitive</option>
            <option value="strategic">Strategic</option>
            <!--<option value="none">None</option>-->
          </select>
        </div>
        <div class="spacer"></div>
        <span class="muted" style="font-size: 12px;">{{ total }} total</span>
      </div>
    </div>

    <div *ngIf="!articles.length && !loading" class="card" style="margin-top: 14px; text-align: center; padding: 36px; color: var(--muted);">
      No articles match your filters yet.
    </div>

    <div *ngFor="let a of articles" class="card article-card">
      <div class="article-head">
        <div style="min-width: 0; flex: 1;">
          <a [href]="a.url" target="_blank" rel="noopener" class="title">{{ a.title }}</a>
          <div class="meta">
            <strong>{{ a.companyName }}</strong> · <strong>{{ a.source || 'unknown' }}</strong> ·
            {{ a.publishedAt | date: 'medium' }}
          </div>
        </div>
        <div class="actions">
          <button (click)="toggleEdit(a)">{{ editingId === a._id ? 'Close' : 'Change Classification' }}</button>
          <button class="danger" (click)="del(a)">Delete</button>
        </div>
      </div>

      <div class="badges">
        <ng-container *ngIf="effective(a) as eff">
          <span class="badge badge-{{ eff.impactLevel }}">
            Impact: {{ eff.impactLevel || '—' }}
          </span>
          <span class="badge badge-{{ eff.riskLevel }}">
            Risk: {{ eff.riskLevel || '—' }}
          </span>
          <span class="badge">{{ eff.riskType || 'unclassified' }}</span>
          <span class="badge">{{ eff.sentiment || '—' }}</span>
        </ng-container>
        <span class="badge badge-override" *ngIf="a.userOverride?.overriddenAt">
          user override
        </span>
        <span class="badge" *ngIf="a.classificationStatus !== 'classified'" style="background:#fef3c7; color:#92400e;">
          {{ a.classificationStatus }}
        </span>
        <span class="badge" *ngIf="a.emailedImmediate" style="background:#dbeafe; color:#1e40af;">alerted</span>
      </div>

      <p *ngIf="a.classification?.rationale" class="rationale">
        <strong style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px;">AI rationale</strong><br/>
        {{ a.classification?.rationale }}
      </p>
      <p *ngIf="a.userOverride?.note" class="rationale override-note">
        <strong style="font-size: 11px; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.4px;">Your note</strong><br/>
        {{ a.userOverride?.note }}
      </p>
      <p *ngIf="a.description && !a.classification?.rationale" class="description">{{ a.description }}</p>

      <div *ngIf="a.classification?.suggestedActions?.length && editingId !== a._id" class="suggested">
        <strong>Suggested actions:</strong>
        <ul>
          <li *ngFor="let s of a.classification?.suggestedActions">{{ s }}</li>
        </ul>
      </div>

      <div *ngIf="editingId === a._id && editState" class="override-panel">
        <div class="override-grid">
          <div>
            <label>Impact</label>
            <select [(ngModel)]="editState.impactLevel">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label>Risk level</label>
            <select [(ngModel)]="editState.riskLevel">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label>Risk type</label>
            <select [(ngModel)]="editState.riskType">
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="reputational">Reputational</option>
              <option value="regulatory">Regulatory</option>
              <option value="competitive">Competitive</option>
              <option value="strategic">Strategic</option>
              <<!--<option value="none">None</option>-->
            </select>
          </div>
          <div>
            <label>Sentiment</label>
            <select [(ngModel)]="editState.sentiment">
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
            </select>
          </div>
        </div>
        <div style="margin-top: 10px;">
          <label>Why does this need correction? (used to teach future classifications)</label>
          <textarea [(ngModel)]="editState.note" rows="2" placeholder="e.g. This kind of RBI circular always has Critical impact on us."></textarea>
        </div>
        <div class="override-actions">
          <div class="quick-row">
            <span class="quick-label">Quick set impact:</span>
            <button class="quick badge-Low" (click)="quickImpact('Low')">Low</button>
            <button class="quick badge-Medium" (click)="quickImpact('Medium')">Medium</button>
            <button class="quick badge-High" (click)="quickImpact('High')">High</button>
            <button class="quick badge-Critical" (click)="quickImpact('Critical')">Critical</button>
          </div>
          <div class="quick-row">
            <span class="quick-label">Quick set risk:</span>
            <button class="quick badge-Low" (click)="quickRisk('Low')">Low</button>
            <button class="quick badge-Medium" (click)="quickRisk('Medium')">Medium</button>
            <button class="quick badge-High" (click)="quickRisk('High')">High</button>
            <button class="quick badge-Critical" (click)="quickRisk('Critical')">Critical</button>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            <button class="primary" (click)="saveOverride(a)" [disabled]="saving">Save & teach AI</button>
            <button (click)="cancelEdit()" [disabled]="saving">Cancel</button>
            <button class="danger" *ngIf="a.userOverride?.overriddenAt" (click)="clearOverride(a)" [disabled]="saving">Clear override</button>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="total > articles.length" style="text-align: center; margin-top: 16px;">
      <button (click)="loadMore()" [disabled]="loading">Load more</button>
    </div>
  `,
  styles: [
    `
      h1 { margin: 0 0 4px 0; font-size: 24px; }
      .article-card { margin-top: 14px; }
      .article-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
      .title { font-size: 16px; font-weight: 600; color: var(--text); text-decoration: none; line-height: 1.4; word-break: break-word; }
      .title:hover { color: var(--primary); }
      .meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
      .badges { margin-top: 12px; }
      .actions { display: flex; gap: 6px; flex-shrink: 0; }
      .actions button { font-size: 11px; padding: 4px 9px; }
      .rationale { font-size: 13px; line-height: 1.5; color: #374151; margin: 12px 0 4px 0; padding: 10px 12px; background: var(--surface-2); border-left: 3px solid var(--primary); border-radius: 4px; }
      .rationale.override-note { background: #f5f3ff; border-left-color: #7c3aed; }
      .description { font-size: 12px; color: var(--muted); line-height: 1.45; margin: 8px 0 0 0; }
      .suggested { font-size: 12px; color: #374151; margin-top: 10px; }
      .suggested ul { margin: 4px 0 0 18px; padding: 0; }

      .override-panel { margin-top: 14px; padding: 14px; background: #faf5ff; border: 1px dashed #d8b4fe; border-radius: 8px; }
      .override-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
      @media (max-width: 768px) { .override-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 480px) { .override-grid { grid-template-columns: 1fr; } }
      .override-actions { margin-top: 12px; }
      .quick-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; font-size: 11px; }
      .quick-label { color: var(--muted); font-size: 11px; min-width: 110px; }
      button.quick { font-size: 11px; padding: 4px 10px; border: 1px solid transparent; }
      button.quick.badge-Low { background: #dcfce7; color: var(--low); }
      button.quick.badge-Medium { background: #fef9c3; color: var(--medium); }
      button.quick.badge-High { background: #ffedd5; color: var(--high); }
      button.quick.badge-Critical { background: #fee2e2; color: var(--critical); }
    `
  ]
})
export class NewsListComponent implements OnInit {
  private api = inject(ApiService);
  articles: NewsArticle[] = [];
  companies: Company[] = [];
  total = 0;
  loading = false;
  saving = false;
  pageSize = 25;
  skip = 0;
  search = '';
  company = '';
  impactLevel = '';
  riskType = '';

  editingId: string | null = null;
  editState: EditState | null = null;

  cmpny: string | null = null;

  constructor(private route: ActivatedRoute){}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.impactLevel = params.get('impact') ?? '';
      this.cmpny = params.get('company') ?? '';      
    });
    this.api.listCompanies().subscribe((c) => {
      this.companies = c;
          this.reload();
          }
    );
  }

  reload() {

      if(this.companies){
        let temp = this.companies.filter(a => a.name == this.cmpny)[0] ?? null;
        if(temp){
            this.company = temp._id ?? '';
        } 
      }

    this.skip = 0;
    this.fetch(true);
  }

  loadMore() {
    this.skip += this.pageSize;
    this.fetch(false);
  }

  effective(a: NewsArticle): {
    impactLevel?: ImpactLevel;
    riskLevel?: ImpactLevel;
    riskType?: RiskType;
    sentiment?: string;
  } {
    const c = a.classification || {};
    const u = a.userOverride;
    if (!u || !u.overriddenAt) return c;
    return {
      impactLevel: u.impactLevel || c.impactLevel,
      riskLevel: u.riskLevel || c.riskLevel,
      riskType: u.riskType || c.riskType,
      sentiment: u.sentiment || c.sentiment
    };
  }

  toggleEdit(a: NewsArticle) {
    if (this.editingId === a._id) {
      this.cancelEdit();
      return;
    }
    this.editingId = a._id;
    const u = a.userOverride || {};
    const c = a.classification || {};
    this.editState = {
      impactLevel: (u.impactLevel || c.impactLevel || 'Low') as ImpactLevel,
      riskLevel: (u.riskLevel || c.riskLevel || 'Low') as ImpactLevel,
      riskType: (u.riskType || c.riskType || 'none') as RiskType,
      sentiment: (u.sentiment || c.sentiment || 'Neutral') as 'Positive' | 'Neutral' | 'Negative',
      note: u.note || ''
    };
  }

  cancelEdit() {
    this.editingId = null;
    this.editState = null;
  }

  quickImpact(lvl: ImpactLevel) {
    if (this.editState) this.editState.impactLevel = lvl;
  }
  quickRisk(lvl: ImpactLevel) {
    if (this.editState) this.editState.riskLevel = lvl;
  }

  saveOverride(a: NewsArticle) {
    if (!this.editState) return;
    this.saving = true;
    const payload: Partial<UserOverride> = { ...this.editState };
    this.api.overrideClassification(a._id, payload).subscribe({
      next: (updated) => {
        const idx = this.articles.findIndex((x) => x._id === a._id);
        if (idx >= 0) this.articles[idx] = updated;
        this.saving = false;
        this.cancelEdit();
      },
      error: (err) => {
        alert('Failed to save: ' + (err.error?.error || err.message));
        this.saving = false;
      }
    });
  }

  clearOverride(a: NewsArticle) {
    if (!confirm('Remove your override and revert to the AI classification?')) return;
    this.saving = true;
    this.api.clearOverride(a._id).subscribe({
      next: (updated) => {
        const idx = this.articles.findIndex((x) => x._id === a._id);
        if (idx >= 0) this.articles[idx] = updated;
        this.saving = false;
        this.cancelEdit();
      },
      error: () => (this.saving = false)
    });
  }

  private fetch(replace: boolean) {
    this.loading = true;
    const params: Record<string, string> = { limit: String(this.pageSize), skip: String(this.skip) };
    if (this.search) params['search'] = this.search;
    if (this.company) params['company'] = this.company;
    if (this.impactLevel) params['impactLevel'] = this.impactLevel;
    if (this.riskType) params['riskType'] = this.riskType;

    this.api.listNews(params).subscribe({
      next: (r) => {
        this.total = r.total;
        this.articles = replace ? r.items : [...this.articles, ...r.items];
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  del(a: NewsArticle) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    this.api.deleteNews(a._id).subscribe(() => {
      this.articles = this.articles.filter((x) => x._id !== a._id);
      this.total -= 1;
    });
  }
}
