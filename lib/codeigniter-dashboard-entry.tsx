/**
 * CodeIgniter Entry Point - Loads FULL Dashboard
 * This replaces the simplified test component with your actual dashboard
 */
import React from 'react';
import DashboardPage from '../app/dashboard/page';
import '../app/globals.css'; // Import Tailwind and global styles

interface Props {
  api: any;
  projectId: number;
}

export default function CodeIgniterDashboardEntry({ api, projectId }: Props) {
  // Your dashboard is ready to render!
  // It uses Zustand store which works perfectly in standalone bundles
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <DashboardPage />
    </div>
  );
}
