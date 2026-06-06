import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { Configuration } from '../models';

const EMPTY: Configuration = {
  riskLevelDefinitions: { Low: '', Medium: '', High: '', Critical: '' },
  impactLevelDefinitions: { Low: '', Medium: '', High: '', Critical: '' },
  riskTypeDefinitions: {
    financial: '',
    operational: '',
    reputational: '',
    regulatory: '',
    competitive: '',
    strategic: ''
  },
  extraGuidance: ''
};

const LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
const RISK_TYPES = ['financial', 'operational', 'reputational', 'regulatory', 'competitive', 'strategic'] as const;

const IMPACT_PLACEHOLDERS: Record<string, string> = {
  Low:
    'e.g. Routine market noise. No exposure to our book, no regulatory impact, no counterparty risk.',
  Medium:
    'e.g. Affects a lender partner indirectly or signals a sectoral shift we should be aware of.',
  High:
    'e.g. Material impact on our portfolio, a key lender partner, or our regulatory environment.',
  Critical:
    'e.g. Direct, immediate threat — large lender partner default, RBI/NHB change to mortgage-guarantee rules, MD-level incident at IMGC.'
};

const RISK_PLACEHOLDERS: Record<string, string> = {
  Low: 'e.g. Minor process incident, isolated event, no systemic concern.',
  Medium: 'e.g. Material but contained event — earnings miss, mid-tier rating action, localized fraud.',
  High: 'e.g. Sector-wide stress, regulatory enforcement action, large NPA disclosure.',
  Critical: 'e.g. Systemic crisis, regulator emergency action, large institutional failure.'
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Risk &amp; Impact Definitions</h1>
    <p class="muted">
      These definitions are fed to the AI on every classification run. Edit them to teach the model
      what each level means specifically for your business — the next fetch will use the updated guidance.
    </p>

    <div *ngIf="status" class="card" [ngClass]="status.kind"
         style="margin-top: 14px;">
      {{ status.msg }}
    </div>

    <div *ngIf="cfg" class="card section">
      <div class="section-head">
        <div>
          <h2>Impact levels</h2>
          <p class="muted small">How materially a news item affects {{ companyName }} specifically.</p>
        </div>
      </div>
      <div class="defs-grid">
        <div *ngFor="let lvl of levels" class="def-row">
          <label><span class="badge badge-{{ lvl }}">{{ lvl }}</span> impact means…</label>
          <textarea [(ngModel)]="cfg.impactLevelDefinitions[lvl]"
                    [placeholder]="impactPlaceholder[lvl]"
                    rows="3"></textarea>
        </div>
      </div>
    </div>

    <div *ngIf="cfg" class="card section">
      <div class="section-head">
        <div>
          <h2>Risk levels</h2>
          <p class="muted small">How severe the underlying news event is, in absolute terms.</p>
        </div>
      </div>
      <div class="defs-grid">
        <div *ngFor="let lvl of levels" class="def-row">
          <label><span class="badge badge-{{ lvl }}">{{ lvl }}</span> risk means…</label>
          <textarea [(ngModel)]="cfg.riskLevelDefinitions[lvl]"
                    [placeholder]="riskPlaceholder[lvl]"
                    rows="3"></textarea>
        </div>
      </div>
    </div>

    <div *ngIf="cfg" class="card section">
      <div class="section-head" (click)="riskTypesOpen = !riskTypesOpen" style="cursor:pointer;">
        <div>
          <h2>Risk type definitions <span class="muted small">(optional)</span></h2>
          <p class="muted small">Override the default phrasing for each risk category. Leave blank to keep the defaults.</p>
        </div>
        <button (click)="riskTypesOpen = !riskTypesOpen; $event.stopPropagation()">
          {{ riskTypesOpen ? 'Hide' : 'Show' }}
        </button>
      </div>
      <div *ngIf="riskTypesOpen" class="defs-grid two-col">
        <div *ngFor="let t of riskTypes" class="def-row">
          <label style="text-transform: capitalize;">{{ t }}</label>
          <textarea [(ngModel)]="cfg.riskTypeDefinitions[t]"
                    rows="2"
                    [placeholder]="'What counts as ' + t + ' risk for us?'"></textarea>
        </div>
      </div>
    </div>

    <div *ngIf="cfg" class="card section">
      <h2>Extra guidance</h2>
      <p class="muted small">
        Free-form instructions for the AI. Use this for organisation-specific nuances that don't fit
        into a level — e.g. "Always treat news mentioning NHB as Critical impact even if vague."
      </p>
      <textarea [(ngModel)]="cfg.extraGuidance" rows="5"
                placeholder="e.g. Mortgage-guarantee specific rules, sensitive geographies, watchlist partners..."></textarea>
    </div>

    <div *ngIf="cfg" class="toolbar" style="margin-top: 18px;">
      <button class="primary" (click)="save()" [disabled]="saving">
        {{ saving ? 'Saving…' : 'Save & apply next fetch' }}
      </button>
      <button (click)="reload()" [disabled]="saving">Discard changes</button>
      <button class="danger" (click)="reset()" [disabled]="saving">Reset to defaults</button>
      <div class="spacer"></div>
      <span class="muted small" *ngIf="cfg.updatedAt">
        Last updated {{ cfg.updatedAt | date: 'medium' }}
      </span>
    </div>
  `,
  styles: [
    `
      h1 { margin: 0 0 4px 0; font-size: 24px; }
      h2 { margin: 0 0 4px 0; font-size: 15px; }
      .small { font-size: 12px; }
      .section { margin-top: 16px; }
      .section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
      .defs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .defs-grid.two-col { grid-template-columns: 1fr 1fr; }
      .def-row label { display: flex; align-items: center; gap: 8px; text-transform: none; letter-spacing: 0; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
      @media (max-width: 900px) {
        .defs-grid, .defs-grid.two-col { grid-template-columns: 1fr; }
      }
      .card.ok { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
      .card.err { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    `
  ]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  cfg: Configuration | null = null;
  saving = false;
  riskTypesOpen = false;
  status: { kind: 'ok' | 'err'; msg: string } | null = null;

  levels = LEVELS;
  riskTypes = RISK_TYPES;
  impactPlaceholder = IMPACT_PLACEHOLDERS;
  riskPlaceholder = RISK_PLACEHOLDERS;
  companyName = 'your company';

  ngOnInit() {
    this.reload();
    this.api.health().subscribe({
      next: (h) => (this.companyName = h.company)
    });
  }

  reload() {
    this.status = null;
    this.api.getConfig().subscribe({
      next: (c) => {
        this.cfg = this.normalize(c);
      },
      error: (err) => (this.status = { kind: 'err', msg: 'Failed to load: ' + (err.error?.error || err.message) })
    });
  }

  save() {
    if (!this.cfg) return;
    this.saving = true;
    this.status = null;
    this.api.updateConfig(this.cfg).subscribe({
      next: (c) => {
        this.cfg = this.normalize(c);
        this.saving = false;
        this.status = { kind: 'ok', msg: 'Saved. The next fetch + classify run will use these definitions.' };
        setTimeout(() => (this.status = null), 6000);
      },
      error: (err) => {
        this.saving = false;
        this.status = { kind: 'err', msg: 'Save failed: ' + (err.error?.error || err.message) };
      }
    });
  }

  reset() {
    if (!confirm('Reset all definitions to blank? The AI will fall back to general industry judgement.')) return;
    this.saving = true;
    this.api.resetConfig().subscribe({
      next: (c) => {
        this.cfg = this.normalize(c);
        this.saving = false;
        this.status = { kind: 'ok', msg: 'Reset. Save (already applied).' };
      },
      error: () => (this.saving = false)
    });
  }

  private normalize(c: Configuration): Configuration {
    return {
      ...EMPTY,
      ...c,
      riskLevelDefinitions: { ...EMPTY.riskLevelDefinitions, ...(c.riskLevelDefinitions || {}) },
      impactLevelDefinitions: { ...EMPTY.impactLevelDefinitions, ...(c.impactLevelDefinitions || {}) },
      riskTypeDefinitions: { ...EMPTY.riskTypeDefinitions, ...(c.riskTypeDefinitions || {}) }
    };
  }
}
