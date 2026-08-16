export interface Kpis {
  total_customers: number;
  activation_rate: number;
  avg_arpu: number;
  avg_next_month_spend: number;
  avg_spend_among_activators: number;
  total_projected_data_revenue: number;
  current_data_user_rate: number;
  avg_tenure_months: number;
  avg_evaporation: number;
}

export interface SegmentRow {
  segment: string;
  customers: number;
  activation_rate: number;
  avg_next_month: number;
  avg_arpu: number;
}

export interface BucketRow {
  bucket: string;
  customers: number;
  activation_rate: number;
}

export interface AnalyticsBundle {
  kpis: Kpis;
  by_region: SegmentRow[];
  by_handset: SegmentRow[];
  by_offer: SegmentRow[];
  by_statut: SegmentRow[];
  by_statut_rgs90: SegmentRow[];
  by_canal: SegmentRow[];
  volume_mix: { volume_4g_share: number; volume_3g_share: number; volume_2g_share: number };
  arpu_distribution: BucketRow[];
  tenure_distribution: BucketRow[];
}

export interface Customer {
  id: number;
  code_contrat: string;
  statut: string;
  region: string;
  handset: string;
  offre: string;
  canal_de_vente: string;
  anc_m: number;
  arpu: number;
  mnt_forfait_data: number;
  is_data_user_now: boolean;
  target_next_month: number;
  will_activate: boolean;
}

export interface CustomerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

export interface PredictionResult {
  model1_tweedie: { label: string; predicted_amount: number };
  model2_hurdle: {
    label: string;
    activation_probability: number;
    predicted_amount_if_active: number;
    expected_amount: number;
  };
  consensus: { average_expected_amount: number; likely_to_activate: boolean };
  customer?: Customer;
  actual_next_month?: number;
  features_used?: Record<string, unknown>;
}

export interface FeatureSchemaField {
  name: string;
  type: 'numeric' | 'categorical';
  default: number | string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface FormSchemaResponse {
  curated_fields: FeatureSchemaField[];
  full_schema: FeatureSchemaField[];
  defaults: Record<string, unknown>;
}

export interface FeatureImportanceRow {
  feature: string;
  importance: number;
}

export interface ModelInfo {
  key: string;
  name: string;
  subtitle: string;
  algorithm_family: string;
  metrics: { rmse: number; rmse_excl_top1pct: number; mae: number; r2: number };
  classifier_metrics?: { auc: number; f1: number; precision: number; recall: number };
  strengths: string[];
  weaknesses: string[];
}

export interface ModelComparisonResponse {
  model1: ModelInfo;
  model2: ModelInfo;
  baselines: {
    predict_mean: { rmse: number };
    carry_forward_current_month: { rmse: number; mae: number };
  };
  feature_importance: {
    model1_tweedie: FeatureImportanceRow[];
    model2_classifier: FeatureImportanceRow[];
    model2_regressor: FeatureImportanceRow[];
  };
}

export interface ReportConfigResponse {
  embed_url: string;
  title: string;
  native: {
    kpis: Kpis;
    by_handset: SegmentRow[];
    arpu_distribution: BucketRow[];
    volume_mix: { volume_4g_share: number; volume_3g_share: number; volume_2g_share: number };
    by_region: SegmentRow[];
    by_offer: SegmentRow[];
    by_statut_rgs90: SegmentRow[];
    tenure_distribution: BucketRow[];
  };
}
