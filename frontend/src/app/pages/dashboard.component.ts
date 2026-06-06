import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { NewsArticle, Stats } from '../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <h1>Dashboard</h1>
    <!--<p class="muted">Risk-classified news activity from the last 7 days.</p>-->

    <div class="grid-4" style="margin-top: 18px;" *ngIf="stats">
      <div class="card stat hand-cursor" routerLink="/news">
        <div class="stat-label">Total articles</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="card stat hand-cursor" [routerLink]="['/news', { impact: 'Critical' }]">
        <div class="stat-label">Critical impact</div>
        <div class="stat-value critical">{{ getCount('Critical') }}</div>
      </div>
      <div class="card stat hand-cursor" [routerLink]="['/news', { impact: 'High' }]">
        <div class="stat-label">High impact</div>
        <div class="stat-value high">{{ getCount('High') }}</div>
      </div>
      <div class="card stat">
        <div class="stat-label">Companies tracked</div>
        <div class="stat-value">{{ stats.topCompanies.length }}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-top: 18px;">
      <div class="card">
        <h3>Impact distribution</h3>
        <div *ngFor="let item of stats?.byImpact" class="bar-row hand-cursor" [routerLink]="['/news', { impact: item._id}]">
          <span class="badge badge-{{ item._id }}">{{ item._id }}</span>
          <div class="bar"><div class="bar-fill bar-{{ item._id }}" [style.width.%]="barWidth(item.count)"></div></div>
          <span class="bar-count">{{ item.count }}</span>
        </div>
      </div>
      <div class="card">
        <h3>Top mentioned companies</h3>
        <div *ngFor="let item of stats?.topCompanies" class="bar-row hand-cursor" [routerLink]="['/news', { company: item._id}]">
          <span class="company-name">{{ item._id }}</span>
          <div class="bar"><div class="bar-fill default" [style.width.%]="barWidthTopCompany(item.count)"></div></div>
          <span class="bar-count">{{ item.count }}</span>
        </div>
      </div>
    </div>

    <!--<div class="card" style="margin-top: 18px;">
      <div class="toolbar">
        <h3 style="margin: 0;">Recent high-impact items</h3>
        <div class="spacer"></div>
        <a routerLink="/news" style="font-size: 12px;">View all →</a>
      </div>
      <div *ngIf="!topArticles.length" class="muted" style="text-align:center; padding: 20px;">
        No articles yet. Trigger a fetch from the Runs page.
      </div>
      <div *ngFor="let a of topArticles" class="article-row">
        <div>
          <a [href]="a.url" target="_blank" rel="noopener" class="article-title">{{ a.title }}</a>
          <div class="article-meta">
            {{ a.companyName }} · {{ a.source }} · {{ a.publishedAt | date: 'short' }}
          </div>
          <div *ngIf="a.classification?.rationale" class="article-rationale">{{ a.classification?.rationale }}</div>
        </div>
        <div style="text-align: right; min-width: 110px;">
          <span class="badge badge-{{ a.classification?.impactLevel }}">{{ a.classification?.impactLevel }}</span>
          <div class="muted" style="font-size: 11px; margin-top: 4px;">{{ a.classification?.riskType }}</div>
        </div>
      </div>
    </div>-->
  
  
  `,
  styles: [
    `
      h1 { margin: 0 0 4px 0; font-size: 24px; }
      h3 { margin: 0 0 12px 0; font-size: 14px; }
      .stat { padding: 14px 16px; }
      .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
      .stat-value { font-size: 28px; font-weight: 700; margin-top: 6px; }
      .stat-value.critical { color: var(--critical); }
      .stat-value.high { color: var(--high); }
      .bar-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
      .bar { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
      .bar-fill { height: 100%; transition: width 0.3s; }
      .bar-fill.default { background: #94a3b8; }
      .bar-fill.bar-Low { background: var(--low); }
      .bar-fill.bar-Medium { background: var(--medium); }
      .bar-fill.bar-High { background: var(--high); }
      .bar-fill.bar-Critical { background: var(--critical); }
      .bar-count { font-size: 12px; color: var(--muted); min-width: 30px; text-align: right; }
      .company-name { font-size: 12px; min-width: 140px; }
      .article-row { display: flex; gap: 14px; padding: 12px 0; border-top: 1px solid var(--border); }
      .article-row:first-of-type { border-top: 0; }
      .article-title { color: var(--text); font-weight: 600; font-size: 14px; text-decoration: none; }
      .article-title:hover { color: var(--primary); }
      .article-meta { font-size: 11px; color: var(--muted); margin-top: 3px; }
      .article-rationale { font-size: 12px; color: #4b5563; margin-top: 6px; line-height: 1.4; }
      .hand-cursor { cursor: pointer;}
    `
  ]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  stats: Stats | null = null;
  topArticles: NewsArticle[] = [];

  ngOnInit() {
    this.api.newsStats().subscribe((s) => (this.stats = s));
    this.api.listNews({ impactLevel: 'High', limit: '5' }).subscribe((r) => {
      this.topArticles = r.items;
      if (this.topArticles.length < 5) {
        this.api.listNews({ impactLevel: 'Critical', limit: '5' }).subscribe((rc) => {
          this.topArticles = [...rc.items, ...this.topArticles].slice(0, 5);
        });
      }
    });
  }

  getCount(level: string): number {
    if (!this.stats) return 0;
    const m = this.stats.byImpact.find((b) => b._id === level);
    return m ? m.count : 0;
  }

  barWidth(count: number): number {
    if (!this.stats || !this.stats.total) return 0;
    const max = Math.max(...this.stats.byImpact.map((b) => b.count), 1);
    return (count / max) * 100;
  }

  barWidthTopCompany(count: number): number {
    if (!this.stats || !this.stats.topCompanies.length) return 0;
    const max = Math.max(...this.stats.topCompanies.map((b) => b.count), 1);
    return (count / max) * 100;
  }
}
