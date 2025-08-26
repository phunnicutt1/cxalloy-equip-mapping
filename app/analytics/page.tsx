'use client';

import React from 'react';
import TemplateAnalyticsDashboard from '../../components/analytics/TemplateAnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Template Analytics & Reporting
            </h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and performance insights for equipment point templates
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TemplateAnalyticsDashboard />
      </div>
    </div>
  );
} 