import React, { useState, useRef } from 'react';

export default function TestDetection() {
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageBase64(event.target.result);
        setError(null);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const testDetection = async () => {
    if (!imageBase64) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Sending request to /api/detect-equipment');
      const response = await fetch('/api/detect-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      setResult(data);
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e27',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'system-ui'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1>🧪 Equipment Detection Test</h1>
        
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '1rem' }}>1. Upload Image</h2>
          <button 
            onClick={() => fileRef.current.click()}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px dashed rgba(59, 130, 246, 0.5)',
              borderRadius: '12px',
              background: 'transparent',
              color: '#60a5fa',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            📁 Click to Select Image
          </button>
          <input 
            ref={fileRef}
            type="file" 
            accept="image/*" 
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          {imageBase64 && (
            <div style={{ marginBottom: '1rem' }}>
              <img 
                src={imageBase64} 
                alt="Selected" 
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  maxHeight: '300px',
                  objectFit: 'cover'
                }}
              />
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>✓ Image selected</p>
            </div>
          )}

          <h2 style={{ fontSize: '20px', marginBottom: '1rem', marginTop: '2rem' }}>2. Test Detection</h2>
          <button 
            onClick={testDetection}
            disabled={!imageBase64 || loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: !imageBase64 ? 0.5 : 1
            }}
          >
            {loading ? '⏳ Testing...' : '🚀 Test Equipment Detection'}
          </button>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginTop: '1rem',
              color: '#fca5a5'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>❌ {error}</p>
            </div>
          )}

          {result && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginTop: '1rem',
              color: '#6ee7b7'
            }}>
              <h3 style={{ marginTop: 0, color: '#10b981' }}>✓ Results:</h3>
              <p style={{ fontSize: '12px', marginBottom: '1rem' }}>
                <strong>Equipment Detected:</strong>
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                {result.equipment && result.equipment.map((item, i) => (
                  <span key={i} style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '13px'
                  }}>
                    {item}
                  </span>
                ))}
              </div>
              {result.error && (
                <p style={{ fontSize: '12px', color: '#fbbf24', margin: 0 }}>
                  ⚠️ Note: {result.error}
                </p>
              )}
              <pre style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '11px',
                overflow: 'auto',
                marginTop: '1rem'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <h3 style={{ marginTop: 0 }}>ℹ️ Troubleshooting</h3>
          <ul style={{ fontSize: '13px', lineHeight: '1.8', color: '#d1d5db' }}>
            <li>✓ API should respond within 5 seconds</li>
            <li>✓ Equipment list should appear as tags</li>
            <li>✓ Check browser console for errors (F12)</li>
            <li>✓ Make sure CLAUDE_API_KEY is set in Vercel</li>
          </ul>
        </div>
      </div>
    </div>
  );
}