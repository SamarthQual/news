export type ImpactLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskType =
  | 'financial'
  | 'operational'
  | 'reputational'
  | 'regulatory'
  | 'competitive'
  | 'strategic'
  | 'none';

export interface Company {
  _id?: string;
  name: string;
  aliases?: string[];
  sector?: string;
  relationship?: 'Self' | 'Customer' | 'Competitor' | 'Counterparty' | 'Partner' | 'Vendor' | 'Watchlist';
  searchKeywords?: string[];
  active?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recipient {
  _id?: string;
  name: string;
  email: string;
  role?: string;
  receiveImmediateAlerts?: boolean;
  receiveDailyDigest?: boolean;
  minImpactLevel?: ImpactLevel;
  companyFilter?: string[];
  active?: boolean;
}

export interface Classification {
  riskType?: RiskType;
  riskLevel?: ImpactLevel;
  impactLevel?: ImpactLevel;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  rationale?: string;
  keyEntities?: string[];
  suggestedActions?: string[];
  confidence?: number;
  model?: string;
  classifiedAt?: string;
}

export interface UserOverride {
  riskType?: RiskType;
  riskLevel?: ImpactLevel;
  impactLevel?: ImpactLevel;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  note?: string;
  overriddenAt?: string;
  overriddenBy?: string;
}

export interface LevelDefinitions {
  Low: string;
  Medium: string;
  High: string;
  Critical: string;
}

export interface RiskTypeDefinitions {
  financial: string;
  operational: string;
  reputational: string;
  regulatory: string;
  competitive: string;
  strategic: string;
}

export interface Configuration {
  _id?: string;
  key?: string;
  riskLevelDefinitions: LevelDefinitions;
  impactLevelDefinitions: LevelDefinitions;
  riskTypeDefinitions: RiskTypeDefinitions;
  extraGuidance?: string;
  updatedBy?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface NewsArticle {
  _id: string;
  company: string | Company;
  companyName: string;
  source?: string;
  author?: string;
  title: string;
  description?: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
  fetchedAt?: string;
  classification?: Classification;
  classificationStatus?: 'pending' | 'classified' | 'failed' | 'skipped';
  classificationError?: string;
  userOverride?: UserOverride | null;
  emailedImmediate?: boolean;
  includedInDigest?: boolean;
}

export interface Stats {
  window: string;
  total: number;
  byImpact: { _id: string; count: number }[];
  byRisk: { _id: string; count: number }[];
  topCompanies: { _id: string; name:string; count: number }[];
}

export interface RunLog {
  _id: string;
  job: 'fetch' | 'digest' | 'manual';
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  stats: {
    companiesProcessed: number;
    articlesFetched: number;
    articlesNew: number;
    articlesClassified: number;
    articlesFailed: number;
    emailsSent: number;
  };
  error?: string;
}
