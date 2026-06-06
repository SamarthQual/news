import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
import { RunLog } from '../models';

@Component({
  selector: 'app-runs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex; align-items:center; justify-content: space-between;">
      <div>
        <h1>Runs</h1>
        <p class="muted">Job history and manual triggers. Cron runs the fetch+classify every 2h and a digest at 8:30 AM IST by default.</p>
      </div>
      <div style="display:flex; gap: 8px;">
        <button style="background-color:#f37920; color:#fff" (click)="triggerFetch()" [disabled]="busy">Fetch + classify now</button>
        <button (click)="triggerDigest()" [disabled]="busy">Send digest now</button>
      </div>
    </div>

    <div *ngIf="message" class="card" style="margin-top: 14px; background: #ecfdf5; border-color: #a7f3d0;">
      {{ message }}
    </div>

    <div class="card" style="margin-top: 16px; padding: 0;">
     <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Companies</th>
            <th>Fetched</th>
            <th>New</th>
            <th>Classified</th>
            <th>Failed</th>
            <th>Emails</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of runs">
            <td><span class="badge">{{ r.job }}</span></td>
            <td>
              <span class="badge" [class]="'status-' + r.status">{{ r.status }}</span>
            </td>
            <td class="muted">{{ r.startedAt | date: 'short' }}</td>
            <td class="muted">{{ duration(r) }}</td>
            <td>{{ r.stats.companiesProcessed || 0 }}</td>
            <td>{{ r.stats.articlesFetched || 0 }}</td>
            <td><strong>{{ r.stats.articlesNew || 0 }}</strong></td>
            <td>{{ r.stats.articlesClassified || 0 }}</td>
            <td [style.color]="(r.stats.articlesFailed || 0) > 0 ? 'var(--critical)' : 'inherit'">
              {{ r.stats.articlesFailed || 0 }}
            </td>
            <td>{{ r.stats.emailsSent || 0 }}</td>
          </tr>
          <tr *ngIf="!runs.length">
            <td colspan="10" class="muted" style="text-align:center; padding: 30px;">No runs yet.</td>
          </tr>
        </tbody>
      </table>
     </div>
    </div>
  `,
  styles: [
    `
      h1 { margin: 0 0 4px 0; font-size: 24px; }
      .status-success { background: #dcfce7; color: var(--low); }
      .status-partial { background: #fef9c3; color: var(--medium); }
      .status-failed { background: #fee2e2; color: var(--critical); }
      .status-running { background: #dbeafe; color: #1d4ed8; }
    `
  ]
})
export class RunsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  runs: RunLog[] = [];
  busy = false;
  message = '';
  private poll?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.load();
    this.poll = setInterval(() => this.load(), 10000);
  }

  ngOnDestroy() {
    if (this.poll) clearInterval(this.poll);
  }

  load() {
    this.api.listRuns().subscribe((r) => (this.runs = r));
  }

  triggerFetch() {
    this.busy = true;
    this.api.triggerFetch().subscribe({
      next: () => {
        this.message = 'Fetch + classify started — refresh in a few seconds';
        this.busy = false;
        setTimeout(() => this.load(), 1500);
        setTimeout(() => (this.message = ''), 8000);
      },
      error: () => (this.busy = false)
    });
  }

  triggerDigest() {
    this.busy = true;
    this.api.triggerDigest().subscribe({
      next: () => {
        this.message = 'Digest generation started';
        this.busy = false;
        setTimeout(() => this.load(), 1500);
        setTimeout(() => (this.message = ''), 8000);
      },
      error: () => (this.busy = false)
    });
  }

  duration(r: RunLog): string {
    if (!r.finishedAt) return r.status === 'running' ? 'running…' : '—';
    const ms = new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
