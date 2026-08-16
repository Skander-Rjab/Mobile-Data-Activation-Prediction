import React from 'react';
import { createRoot } from 'react-dom/client';

import HomeHero, { HomeKpiStrip } from './pages/Home';
import DataExplorer from './pages/DataExplorer';
import BusinessAnalysis from './pages/BusinessAnalysis';
import ReportsShowcase from './pages/ReportsShowcase';
import ModelsShowcase from './pages/ModelsShowcase';
import PredictTool from './pages/Predict';

function mount(id: string, node: React.ReactElement) {
  const el = document.getElementById(id);
  if (el) createRoot(el).render(node);
}

mount('island-home-hero', <HomeHero />);
mount('island-home-kpis', <HomeKpiStrip />);
mount('island-data-explorer', <DataExplorer />);
mount('island-business-analysis', <BusinessAnalysis />);
mount('island-reports', <ReportsShowcase />);
mount('island-models', <ModelsShowcase />);
mount('island-predict', <PredictTool />);
