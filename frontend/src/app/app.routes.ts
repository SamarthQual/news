import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard.component';
import { NewsListComponent } from './pages/news-list.component';
import { CompaniesComponent } from './pages/companies.component';
import { RecipientsComponent } from './pages/recipients.component';
import { RunsComponent } from './pages/runs.component';
import { SettingsComponent } from './pages/settings.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'news', component: NewsListComponent },
  { path: 'companies', component: CompaniesComponent },
  { path: 'recipients', component: RecipientsComponent },
  { path: 'runs', component: RunsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: 'dashboard' }
];
