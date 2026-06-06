import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { Company } from '../models';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display:flex; align-items:center; justify-content: space-between;">
      <div>
        <h1>Companies</h1>
        <p class="muted">List of companies to monitor in news fetches.</p>
      </div>
      <button style="background-color:#f37920; color:#fff" (click)="openNew()">+ Add company</button>
    </div>

    <div *ngIf="editing" class="card" style="margin-top: 16px;">
      <h3>{{ editing._id ? 'Edit company' : 'New company' }}</h3>
      <div class="grid-2" style="margin-top: 12px;">
        <div>
          <label>Name *</label>
          <input [(ngModel)]="editing.name" placeholder="e.g. HDFC Bank" />
        </div>
        <div>
          <label>Sector</label>
          <input [(ngModel)]="editing.sector" placeholder="Banking, NBFC, etc." />
        </div>
        <div>
          <label>Relationship</label>
          <select [(ngModel)]="editing.relationship">
            <option>Self</option>
            <option>Customer</option>
            <option>Lender Partner</option>
            <option>Competitor</option>
            <option>Partner</option>
            <option>Vendor</option>
            <option>Watchlist</option>
          </select>
        </div>
        <div>
          <label>Aliases (comma-separated)</label>
          <input [ngModel]="aliasesText" (ngModelChange)="setAliases($event)" placeholder="HDFC, Housing Development..." />
        </div>
        <div style="grid-column: span 2;">
          <label>Extra search keywords (comma-separated)</label>
          <input [ngModel]="keywordsText" (ngModelChange)="setKeywords($event)" placeholder="mortgage, home loan" />
        </div>
        <div style="grid-column: span 2;">
          <label>Notes</label>
          <textarea [(ngModel)]="editing.notes" rows="2"></textarea>
        </div>
        <div>
          <label>
            <input type="checkbox" [(ngModel)]="editing.active" style="width:auto; margin-right: 6px;" />
            Active (included in fetches)
          </label>
        </div>
      </div>
      <div class="toolbar" style="margin-top: 14px;">
        <button class="primary" (click)="save()">{{ editing._id ? 'Update' : 'Create' }}</button>
        <button (click)="editing = null">Cancel</button>
        <span *ngIf="error" style="color: var(--critical); font-size: 12px;">{{ error }}</span>
      </div>
    </div>

    <div class="card" style="margin-top: 16px; padding: 0;">
     <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Sector</th>
            <th>Relationship</th>
            <th>Aliases</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of items">
            <td><strong>{{ c.name }}</strong></td>
            <td>{{ c.sector || '—' }}</td>
            <td><span class="badge">{{ c.relationship }}</span></td>
            <td class="muted">{{ (c.aliases || []).join(', ') || '—' }}</td>
            <td>{{ c.active ? '✓' : '✗' }}</td>
            <td style="text-align: right;">
              <button (click)="edit(c)">Edit</button>
              <button class="danger" (click)="del(c)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="!items.length">
            <td colspan="6" class="muted" style="text-align:center; padding: 30px;">No companies yet.</td>
          </tr>
        </tbody>
      </table>
     </div>
    </div>
  `,
  styles: [
    `
      h1 { margin: 0 0 4px 0; font-size: 24px; }
      h3 { margin: 0; font-size: 14px; }
    `
  ]
})
export class CompaniesComponent implements OnInit {
  private api = inject(ApiService);
  items: Company[] = [];
  editing: Partial<Company> | null = null;
  aliasesText = '';
  keywordsText = '';
  error = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listCompanies().subscribe((c) => (this.items = c));
  }

  openNew() {
    this.editing = { name: '', sector: '', relationship: 'Watchlist', active: true, aliases: [], searchKeywords: [] };
    this.aliasesText = '';
    this.keywordsText = '';
    this.error = '';
  }

  edit(c: Company) {
    this.editing = { ...c };
    this.aliasesText = (c.aliases || []).join(', ');
    this.keywordsText = (c.searchKeywords || []).join(', ');
    this.error = '';
  }

  setAliases(value: string) {
    this.aliasesText = value;
    if (this.editing) this.editing.aliases = value.split(',').map((s) => s.trim()).filter(Boolean);
  }

  setKeywords(value: string) {
    this.keywordsText = value;
    if (this.editing) this.editing.searchKeywords = value.split(',').map((s) => s.trim()).filter(Boolean);
  }

  save() {
    if (!this.editing) return;
    this.error = '';
    const obs = this.editing._id
      ? this.api.updateCompany(this.editing._id, this.editing)
      : this.api.createCompany(this.editing);
    obs.subscribe({
      next: () => {
        this.editing = null;
        this.load();
      },
      error: (err) => (this.error = err.error?.error || err.message)
    });
  }

  del(c: Company) {
    if (!confirm(`Delete ${c.name}?`)) return;
    this.api.deleteCompany(c._id!).subscribe(() => this.load());
  }
}
