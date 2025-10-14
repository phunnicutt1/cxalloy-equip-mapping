/**
 * CodeIgniter-specific entry point
 * Minimal component that works without Next.js dependencies
 */
import React from 'react';

interface Props {
  api: any;
  projectId: number;
}

export default function CodeIgniterEquipmentMapping({ api, projectId }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('Loading equipment mapping interface...');

  React.useEffect(() => {
    console.log('[CodeIgniter Entry] Mounted with API:', api, 'Project:', projectId);
    
    // Test API connection
    if (api) {
      setLoading(true);
      api.getEquipment()
        .then((data: any) => {
          console.log('[CodeIgniter Entry] Equipment data:', data);
          setMessage(`Successfully loaded ${data.equipment?.length || 0} equipment items`);
          setLoading(false);
        })
        .catch((err: Error) => {
          console.error('[CodeIgniter Entry] Failed to load equipment:', err);
          setMessage(`Error: ${err.message}`);
          setLoading(false);
        });
    } else {
      setMessage('Error: API not initialized');
    }
  }, [api, projectId]);

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '20px',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          color: '#111827'
        }}>
          CxAlloy Equipment Mapping
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          margin: 0
        }}>
          Building Automation Equipment Mapping for BACnet trio files
        </p>
      </div>

      <div style={{
        background: loading ? '#fef3c7' : '#dbeafe',
        border: `2px solid ${loading ? '#f59e0b' : '#3b82f6'}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <p style={{
          margin: 0,
          fontSize: '1.125rem',
          color: loading ? '#92400e' : '#1e40af',
          fontWeight: loading ? 'normal' : '500'
        }}>
          {loading && '⏳ '}
          {message}
        </p>
      </div>

      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: 0 }}>
          Status
        </h2>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>React: ✅ Loaded (v{React.version})</li>
          <li>API Bridge: {api ? '✅ Connected' : '❌ Not connected'}</li>
          <li>Project ID: {projectId}</li>
          <li>Component: CodeIgniter Entry Point (Simplified)</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', color: '#6b7280', fontSize: '0.875rem' }}>
        <p style={{ margin: '5px 0' }}>
          <strong>Note:</strong> This is a simplified test component. The full dashboard with three-panel
          layout will load once we resolve the React bundling issues.
        </p>
        <p style={{ margin: '5px 0' }}>
          Check the browser console for detailed API connection information.
        </p>
      </div>
    </div>
  );
}
