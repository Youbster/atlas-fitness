import React, { useState, useRef, useEffect } from 'react';

const EXERCISE_DATABASE = {
  'Push-ups': {
    description: 'Upper body pressing movement',
    beginner: { reps: '8-12', sets: 3, rest: '60s' },
    intermediate: { reps: '12-15', sets: 4, rest: '45s' },
    advanced: { reps: '15-20', sets: 5, rest: '30s' },
    form: 'Keep core tight, elbows at 45°, lower until chest nearly touches ground.',
  },
  'Squats': {
    description: 'Lower body compound movement',
    beginner: { reps: '12-15', sets: 3, rest: '60s' },
    intermediate: { reps: '15-20', sets: 4, rest: '45s' },
    advanced: { reps: '20-25', sets: 5, rest: '30s' },
    form: 'Feet shoulder-width apart, knees track over toes, descend to parallel or deeper.',
  },
  'Dumbbell Rows': {
    description: 'Back pulling movement',
    beginner: { reps: '10-12', sets: 3, rest: '60s' },
    intermediate: { reps: '12-15', sets: 4, rest: '45s' },
    advanced: { reps: '15-18', sets: 5, rest: '30s' },
    form: 'Hinge at hips, elbow drives back past ribs, squeeze shoulder blade.',
  },
  'Burpees': {
    description: 'Full-body cardio exercise',
    beginner: { reps: '5-8', sets: 3, rest: '90s' },
    intermediate: { reps: '8-12', sets: 4, rest: '60s' },
    advanced: { reps: '12-15', sets: 5, rest: '45s' },
    form: 'Squat down, jump back to plank, push-up, jump feet forward, jump up.',
  },
  'Planks': {
    description: 'Core stability isometric',
    beginner: { reps: '20-30s', sets: 3, rest: '45s' },
    intermediate: { reps: '45-60s', sets: 4, rest: '45s' },
    advanced: { reps: '60-90s', sets: 5, rest: '30s' },
    form: 'Straight line from head to heels, core engaged, no sagging hips.',
  },
  'Jumping Jacks': {
    description: 'Cardio warm-up movement',
    beginner: { reps: '15-20', sets: 2, rest: '45s' },
    intermediate: { reps: '25-30', sets: 3, rest: '45s' },
    advanced: { reps: '40-50', sets: 4, rest: '30s' },
    form: 'Jump feet apart while raising arms, return to start, maintain rhythm.',
  }
};

export default function AtlasFitnessApp() {
  const [step, setStep] = useState('capture');
  const [captureMode, setCaptureMode] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [manualEquipment, setManualEquipment] = useState('');
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [timeLimit, setTimeLimit] = useState(30);
  const [limitations, setLimitations] = useState('');
  const [generatedWorkout, setGeneratedWorkout] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.log('Service worker registration failed:', err);
      });
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCaptureMode('camera');
      setError(null);
    } catch (err) {
      setError('Camera access denied. Please try file upload instead.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      setUploadedImage(imageData);
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
      setCaptureMode(null);
      detectEquipmentFromImage(imageData);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        detectEquipmentFromImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectEquipmentFromImage = async (imageBase64) => {
    setDetectionLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/detect-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to detect equipment');
      }

      const data = await response.json();
      setSelectedEquipment(data.equipment || []);
      setStep('equipment');
    } catch (err) {
      setError(`Detection failed: ${err.message}. You can still add equipment manually.`);
      setSelectedEquipment(['dumbbells', 'bodyweight exercises']);
      setStep('equipment');
    } finally {
      setDetectionLoading(false);
    }
  };

  const handleEquipmentSelection = (item) => {
    setSelectedEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const addManualEquipment = () => {
    if (manualEquipment.trim()) {
      setSelectedEquipment(prev => [...prev, manualEquipment.trim()]);
      setManualEquipment('');
    }
  };

  const generateWorkout = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment: selectedEquipment,
          goal,
          difficulty,
          timeLimit,
          limitations,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate workout');
      }

      const data = await response.json();
      setGeneratedWorkout(data);
      setStep('results');
    } catch (err) {
      setError(`Workout generation failed: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const shareWorkout = async () => {
    const shareText = `Check out my ${difficulty} ${goal} workout! Generated by Atlas Fitness Coach. ${generatedWorkout?.gymSummary}`;
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        // Native share (mobile)
        await navigator.share({
          title: 'Atlas Fitness Workout',
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback: copy to clipboard
        const fullText = `${shareText}\n\n${shareUrl}`;
        navigator.clipboard.writeText(fullText);
        alert('Workout details copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to share workout');
      }
    }
  };

  const startOver = () => {
    setStep('capture');
    setCaptureMode(null);
    setUploadedImage(null);
    setSelectedEquipment([]);
    setGoal('');
    setDifficulty('intermediate');
    setTimeLimit(30);
    setLimitations('');
    setGeneratedWorkout(null);
    setSelectedExercise(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e27', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0e27; color: #fff; }
        
        .atlas-wrapper { 
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          position: relative;
          overflow: hidden;
        }
        
        .atlas-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 400px;
          background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .atlas-container { 
          max-width: 900px; 
          margin: 0 auto; 
          padding: 2rem 1.5rem;
          position: relative;
          z-index: 1;
        }
        
        .header { 
          text-align: center; 
          margin-bottom: 2.5rem; 
          animation: slideDown 0.6s ease-out;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .header h1 { 
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 48px; 
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -1px;
        }
        
        .header p { 
          font-size: 16px; 
          color: #9ca3af;
          font-weight: 400;
        }
        
        .content { 
          background: rgba(20, 27, 48, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 24px; 
          padding: 2.5rem;
          margin-bottom: 2rem;
          animation: fadeIn 0.6s ease-out 0.1s both;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .error-box {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #fca5a5;
        }
        
        .success-box {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #6ee7b7;
        }
        
        .button { 
          padding: 0.875rem 1.75rem; 
          border: 1px solid rgba(59, 130, 246, 0.3);
          background: transparent; 
          border-radius: 12px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500; 
          color: #fff;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }
        
        .button:hover:not(:disabled) { 
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateY(-2px);
        }
        
        .button:disabled { 
          opacity: 0.4; 
          cursor: not-allowed; 
        }
        
        .button-primary { 
          border: 2px solid #3b82f6;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff;
          font-weight: 600;
        }
        
        .button-primary:hover:not(:disabled) { 
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
          border-color: #1d4ed8;
        }
        
        .button-secondary {
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.1);
          color: #6ee7b7;
        }
        
        .button-secondary:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.5);
        }
        
        .card { 
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 16px; 
          padding: 1.5rem; 
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .card:hover { 
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-4px);
          background: rgba(30, 41, 59, 0.9);
        }
        
        .card.selected { 
          border: 2px solid #3b82f6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1));
          color: #fff;
        }
        
        .badge { 
          display: inline-block; 
          padding: 0.4rem 1rem; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 600;
          margin-right: 8px; 
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }
        
        .badge-success { 
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .badge-info { 
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1));
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .badge-warning { 
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1));
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        
        .exercise-card { 
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 16px; 
          padding: 1.5rem; 
          margin-bottom: 1rem; 
          cursor: pointer; 
          transition: all 0.3s ease;
          text-align: left;
          width: 100%;
          font-family: 'Inter', sans-serif;
        }
        
        .exercise-card:hover { 
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-4px);
          background: rgba(30, 41, 59, 0.9);
          box-shadow: 0 12px 32px rgba(59, 130, 246, 0.15);
        }
        
        .grid-2 { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
          gap: 1rem;
        }
        
        h2 { 
          font-size: 24px; 
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #fff;
        }
        
        h3 { 
          font-size: 18px; 
          font-weight: 600;
          margin-bottom: 1rem; 
          color: #fff;
        }
        
        p { 
          line-height: 1.6;
          color: #d1d5db;
        }
        
        input, textarea {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #fff;
          border-radius: 12px;
          padding: 0.75rem;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
        }
        
        input:focus, textarea:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.6);
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        input::placeholder, textarea::placeholder {
          color: #6b7280;
        }
        
        .stat-box {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          margin-bottom: 1rem;
        }
        
        .stat-label {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .loading {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        
        .button-group .button {
          flex: 1;
          min-width: 150px;
        }
      `}
      </style>

      <div className="atlas-wrapper">
        <div className="atlas-container">
          <div className="header">
            <h1>ATLAS</h1>
            <p>AI-powered fitness. Your equipment, your rules</p>
          </div>

          <div className="content">
            {error && <div className="error-box">⚠️ {error}</div>}

            {step === 'capture' && !captureMode && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 16, color: '#d1d5db', marginBottom: '2rem' }}>
                  Let's build your perfect workout
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <button onClick={startCamera} style={{ padding: '2rem', background: 'rgba(30, 41, 59, 0.6)', border: '2px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s', color: '#fff' }} onMouseEnter={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.target.style.background = 'rgba(30, 41, 59, 0.9)'; }} onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'; e.target.style.background = 'rgba(30, 41, 59, 0.6)'; }}>
                    <div style={{ fontSize: 40, marginBottom: '1rem' }}>📱</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: '0.25rem' }}>Take Photo</div>
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>AI detects equipment</div>
                  </button>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'rgba(30, 41, 59, 0.6)', border: '2px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s', color: '#fff' }} onMouseEnter={(e) => { e.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.style.background = 'rgba(30, 41, 59, 0.9)'; }} onMouseLeave={(e) => { e.style.borderColor = 'rgba(59, 130, 246, 0.2)'; e.style.background = 'rgba(30, 41, 59, 0.6)'; }}>
                    <div style={{ fontSize: 40, marginBottom: '1rem' }}>📁</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: '0.25rem' }}>Upload Photo</div>
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>AI analyzes image</div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                <button className="button" onClick={() => { setSelectedEquipment([]); setStep('equipment'); }} style={{ width: '100%', padding: '1rem' }}>
                  Skip &amp; Enter Equipment Manually
                </button>
              </div>
            )}

            {captureMode === 'camera' && (
              <div style={{ textAlign: 'center' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '500px', borderRadius: '16px', marginBottom: '1.5rem', backgroundColor: '#000' }} />
                <canvas ref={canvasRef} width={500} height={500} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="button button-primary" onClick={capturePhoto} style={{ flex: 1, padding: '0.875rem' }}>
                    Capture Photo
                  </button>
                  <button className="button" onClick={() => { if (videoRef.current?.srcObject) { videoRef.current.srcObject.getTracks().forEach(track => track.stop()); } setCaptureMode(null); }} style={{ flex: 1, padding: '0.875rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 'equipment' && (
              <div>
                <h2>Confirm Your Equipment</h2>
                {detectionLoading && (
                  <p style={{ color: '#60a5fa', marginBottom: '1rem' }}>
                    Analyzing image with AI... <span className="loading" style={{ marginLeft: '0.5rem' }}></span>
                  </p>
                )}
                {uploadedImage && !detectionLoading && <img src={uploadedImage} alt="Gym setup" style={{ width: '100%', maxWidth: '400px', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }} />}
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem', color: '#e5e7eb' }}>Detected Equipment:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {selectedEquipment.length > 0 ? selectedEquipment.map(item => <span key={item} className="badge badge-info" style={{ padding: '0.5rem 1rem' }}>{item}</span>) : <p style={{ fontSize: 13, color: '#6b7280' }}>No equipment detected. Add below.</p>}
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem', color: '#e5e7eb' }}>Add Equipment:</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="e.g., water bottles, rope, towel" value={manualEquipment} onChange={(e) => setManualEquipment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addManualEquipment()} style={{ flex: 1 }} />
                    <button className="button" onClick={addManualEquipment} style={{ padding: '0.75rem 1.5rem' }}>Add</button>
                  </div>
                </div>
                <button className="button button-primary" onClick={() => setStep('goal')} disabled={selectedEquipment.length === 0} style={{ width: '100%', padding: '0.875rem' }}>
                  Next: Select Your Goal
                </button>
              </div>
            )}

            {step === 'goal' && (
              <div>
                <h2>What's Your Goal?</h2>
                <div className="grid-2">
                  {['Muscle Gain', 'Fat Loss', 'Endurance', 'Mobility', 'Strength', 'General Fitness'].map(g => (
                    <button key={g} onClick={() => { setGoal(g); setStep('difficulty'); }} className={`card ${goal === g ? 'selected' : ''}`} style={{ textAlign: 'center', padding: '1.5rem', fontSize: 15, fontWeight: 500 }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'difficulty' && (
              <div>
                <h2>Choose Your Difficulty</h2>
                <div className="grid-2">
                  {['beginner', 'intermediate', 'advanced'].map(d => (
                    <button key={d} onClick={() => { setDifficulty(d); setStep('time'); }} className={`card ${difficulty === d ? 'selected' : ''}`} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, textTransform: 'capitalize', marginBottom: '0.5rem' }}>{d}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {d === 'beginner' && 'Building foundation'}
                        {d === 'intermediate' && 'Solid challenge'}
                        {d === 'advanced' && 'Maximum intensity'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'time' && (
              <div>
                <h2>How Many Minutes?</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                  <input type="range" min="10" max="120" step="5" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} style={{ width: '100%', marginBottom: '1.5rem' }} />
                  <div className="grid-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {[15, 30, 45, 60].map(time => (
                      <button key={time} onClick={() => setTimeLimit(time)} className={`card ${timeLimit === time ? 'selected' : ''}`} style={{ textAlign: 'center', padding: '1rem' }}>
                        {time}m
                      </button>
                    ))}
                  </div>
                </div>
                <button className="button button-primary" onClick={() => setStep('limits')} style={{ width: '100%', padding: '0.875rem' }}>
                  Next: Any Limitations?
                </button>
              </div>
            )}

            {step === 'limits' && (
              <div>
                <h2>Physical Limitations or Injuries?</h2>
                <textarea placeholder="e.g., Weak lower back, no jumping, shoulder impingement..." value={limitations} onChange={(e) => setLimitations(e.target.value)} style={{ width: '100%', padding: '0.875rem', minHeight: '100px', marginBottom: '1.5rem' }} />
                <button className="button button-primary" onClick={() => generateWorkout()} disabled={loading} style={{ width: '100%', padding: '0.875rem' }}>
                  {loading ? <>Generating <span className="loading" style={{ marginLeft: '0.5rem' }}></span></> : 'Generate My Workout'}
                </button>
              </div>
            )}

            {step === 'results' && generatedWorkout && !selectedExercise && (
              <div>
                <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 600, margin: '0 0 1rem', color: '#fff', fontStyle: 'italic' }}>
                    "{generatedWorkout.gymSummary}"
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{goal}</span>
                    <span className={`badge badge-${difficulty}`}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                    <span className="badge badge-success">{timeLimit} min</span>
                  </div>
                </div>

                <h3>Warm-Up (2-3 Min)</h3>
                <p style={{ marginBottom: '2rem' }}>{generatedWorkout.warmup}</p>

                <h3>Main Circuit</h3>
                {generatedWorkout.mainCircuit.map((ex, idx) => (
                  <button key={idx} onClick={() => setSelectedExercise(ex)} className="exercise-card">
                    <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 0.5rem', color: '#fff' }}>{ex.exercise}</p>
                    <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 0.25rem' }}>{ex.description}</p>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 0.75rem' }}>{ex.duration}</p>
                    <p style={{ fontSize: 12, color: '#60a5fa' }}>👉 Click to view details</p>
                  </button>
                ))}

                <h3 style={{ marginTop: '2rem' }}>The MacGyver Move</h3>
                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                  <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 0.75rem', color: '#10b981' }}>{generatedWorkout.macgyverMove.name}</p>
                  <p style={{ fontSize: 14, color: '#6ee7b7', margin: 0 }}>{generatedWorkout.macgyverMove.description}</p>
                </div>

                <h3>Safety Tips</h3>
                {generatedWorkout.tips.map((tip, idx) => (
                  <div key={idx} style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: 14, color: '#fcd34d', margin: 0 }}>✓ {tip}</p>
                  </div>
                ))}

                <h3 style={{ marginTop: '2rem' }}>Cool Down (60 sec)</h3>
                <p style={{ marginBottom: '2rem' }}>{generatedWorkout.cooldown}</p>

                <div className="button-group">
                  <button className="button button-secondary" onClick={shareWorkout} style={{ flex: 1 }}>
                    📤 Share Workout
                  </button>
                  <button className="button button-primary" onClick={startOver} style={{ flex: 1 }}>
                    Generate Another
                  </button>
                </div>
              </div>
            )}

            {selectedExercise && (
              <div style={{ textAlign: 'center' }}>
                <button className="button" onClick={() => setSelectedExercise(null)} style={{ marginBottom: '2rem', width: '100%' }}>
                  ← Back to Workout
                </button>
                <h2>{selectedExercise.exercise}</h2>
                <p style={{ marginBottom: '1.5rem' }}>{EXERCISE_DATABASE[selectedExercise.exercise]?.description}</p>

                <div className="stat-box">
                  <h3 style={{ marginTop: 0 }}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                      <div className="stat-label">Reps/Time</div>
                      <div className="stat-value">{EXERCISE_DATABASE[selectedExercise.exercise]?.[difficulty].reps}</div>
                    </div>
                    <div>
                      <div className="stat-label">Sets</div>
                      <div className="stat-value">{EXERCISE_DATABASE[selectedExercise.exercise]?.[difficulty].sets}</div>
                    </div>
                    <div>
                      <div className="stat-label">Rest</div>
                      <div className="stat-value">{EXERCISE_DATABASE[selectedExercise.exercise]?.[difficulty].rest}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                  <h3 style={{ marginTop: 0, color: '#fbbf24' }}>Form Tips</h3>
                  <p style={{ margin: 0, color: '#fcd34d' }}>{EXERCISE_DATABASE[selectedExercise.exercise]?.form}</p>
                </div>

                <button className="button button-primary" onClick={() => setSelectedExercise(null)} style={{ width: '100%', padding: '0.875rem' }}>
                  Got It, Back to Workout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}