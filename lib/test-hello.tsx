import React from 'react';

export function initTestApp(elementId: string) {
  const element = document.getElementById(elementId);

  console.log('initTestApp called with:', elementId);
  console.log('Element found:', element);
  console.log('Element innerHTML before:', element?.innerHTML);

  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }

  console.log('React version:', React.version);
  console.log('Rendering Hello World to:', elementId);

  // Use createRoot for React 18
  const ReactDOM = (window as any).ReactDOM;

  console.log('ReactDOM available:', !!ReactDOM);
  console.log('ReactDOM.createRoot available:', !!ReactDOM?.createRoot);

  if (ReactDOM && ReactDOM.createRoot) {
    console.log('Creating root...');
    const root = ReactDOM.createRoot(element);
    console.log('Root created:', root);

    console.log('Calling render...');
    root.render(
      <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '2rem', color: '#059669', marginBottom: '16px' }}>
          ✓ React is Working!
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          This is a simple React 18 component rendered successfully.
        </p>
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px'
        }}>
          <strong>React Version:</strong> {React.version}
        </div>
      </div>
    );
    console.log('Render called');

    // Check after a delay
    setTimeout(() => {
      console.log('Element innerHTML after render:', element.innerHTML.substring(0, 200));
      console.log('Element children count:', element.children.length);
    }, 100);
  } else {
    console.error('ReactDOM.createRoot not available');
    // Fallback: just set innerHTML directly
    element.innerHTML = '<div style="padding: 40px; background: #fee2e2; border: 2px solid #dc2626;"><h1>React DOM not available!</h1></div>';
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  (window as any).initTestApp = initTestApp;
}
