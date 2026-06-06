import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="mobile-header">
      <button class="hamburger" (click)="toggleSidebar()" aria-label="Open menu">≡</button>
      <span class="brand-mini">Lender News</span>
    </div>

    <div class="sidebar-backdrop" [class.show]="sidebarOpen" (click)="closeSidebar()"></div>

    <div class="shell">
      <aside class="sidebar" [class.open]="sidebarOpen">
        <div class="brand">
          <div class="brand-mark">L</div>
          <div>
            <div class="brand-title">Lender News</div>
            <div class="brand-sub" *ngIf="health">{{ health.company }}</div>
          </div>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active" (click)="closeSidebar()">Dashboard</a>
          <a routerLink="/news" routerLinkActive="active" (click)="closeSidebar()">News Feed</a>
          <a routerLink="/companies" routerLinkActive="active" (click)="closeSidebar()">Companies</a>
          <a routerLink="/recipients" routerLinkActive="active" (click)="closeSidebar()">Recipients</a>
          <a routerLink="/runs" routerLinkActive="active" (click)="closeSidebar()">Runs</a>
          <a routerLink="/settings" routerLinkActive="active" (click)="closeSidebar()">Settings</a>
        </nav>
        <div class="sidebar-footer" *ngIf="health">
          <div class="status-dot ok"></div>
          <span>API online <!--· {{ health.model }}--></span>
        </div>
        <div class="sidebar-footer" *ngIf="healthError">
          <div class="status-dot bad"></div>
          <span>API offline</span>
        </div>
      </aside>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .sidebar {
        width: 240px;
        background: #f37920;
        color: #e5e7eb;
        padding: 20px 14px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .brand { display: flex; gap: 10px; align-items: center; padding: 4px 6px; }
      .brand-mark {
        width: 36px; height: 36px; border-radius: 8px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; color: white;
      }
      .brand-title { font-weight: 700; font-size: 14px; color: white; }
      .brand-sub { font-size: 11px; color: #ffffff; margin-top: 1px; }
      nav { display: flex; flex-direction: column; gap: 2px; }
      nav a {
        display: block;
        padding: 9px 12px;
        border-radius: 7px;
        color: #d1d5db;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
      }
      nav a:hover { background: rgba(255, 255, 255, 0.9); color: black; }
      nav a.active { background: #dadd3a; color: black; }
      .sidebar-footer {
        margin-top: auto;
        font-size: 11px;
        color: #ecf3ff;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; }
      .status-dot.ok { background: #22c55e; }
      .status-dot.bad { background: #ef4444; }
      .content { flex: 1; padding: 28px 32px; overflow-x: auto; min-width: 0; }
    `
  ]
})
export class AppComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  health: { ok: boolean; time: string; company: string; model: string } | null = null;
  healthError = false;
  sidebarOpen = false;

  ngOnInit() {
    this.api.health().subscribe({
      next: (h) => (this.health = h),
      error: () => (this.healthError = true)
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.closeSidebar());
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }
}
