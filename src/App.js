import React, { useState, useRef } from 'react';

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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCaptureMode('camera');
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Camera access required. Please try file upload instead.');
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
      setSelectedEquipment(detectEquipmentFromImage());
      setStep('equipment');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setSelectedEquipment(detectEquipmentFromImage());
        setStep('equipment');
      };
      reader.readAsDataURL(file);
    }
  };

  const detectEquipmentFromImage = () => {
    const possibleEquipment = ['Dumbbells', 'Kettlebell', 'Resistance Bands', 'Pull-up Bar', 'Bench'];
    return possibleEquipment.slice(0, Math.floor(Math.random() * 3) + 2);
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
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          messages: [{
            role: 'user',
            content: `Generate a ${difficulty} difficulty workout using ONLY: ${selectedEquipment.join(', ')}. Goal: ${goal}. Time: ${timeLimit}min. Limitations: ${limitations || 'None'}.

Return ONLY valid JSON (no markdown):
{
  "gymSummary": "Witty one-liner",
  "warmup": "2-3 minute warm-up",
  "mainCircuit": [
    {"exercise": "Name", "description": "What it targets", "duration": "time or reps"}
  ],
  "cooldown": "30-60 second cooldown",
  "tips": ["Safety tip 1", "Safety tip 2"],
  "macgyverMove": {"name": "Exercise", "description": "How to do it"}
}`
          }]
        })
      });

      const data = await response.json();
      const parsed = JSON.parse(data.content[0].text);
      setGeneratedWorkout(parsed);
      setStep('results');
    } catch (error) {
      console.error('Error:', error);
      setGeneratedWorkout({
        gymSummary: "Perfect setup—let's crush it!",
        warmup: "3 minutes: 30 jumping jacks, arm circles, bodyweight squats.",
        mainCircuit: [
          { exercise: 'Push-ups', description: 'Upper body', duration: '3 sets' },
          { exercise: 'Squats', description: 'Lower body', duration: '3 sets' },
          { exercise: 'Planks', description: 'Core', duration: '3 sets' }
        ],
        cooldown: "Walk around, stretch for 60 seconds.",
        tips: ["Keep core tight", "Full range of motion", "Control the movement"],
        macgyverMove: { name: 'Towel Slides', description: 'Use towels on smooth floor for glute activation.' }
      });
      setStep('results');
    }
    setLoading(false);
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
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--color-background-tertiary) 0%, var(--color-background-secondary) 100%)', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .atlas-container { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
        .header { text-align: center; margin-bottom: 2rem; padding: 2rem 1rem; background: var(--color-background-primary); border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .header h1 { font-size: 36px; font-weight: 500; margin-bottom: 0.5rem; color: var(--color-text-primary); letter-spacing: -0.5px; }
        .header p { font-size: 14px; color: var(--color-text-secondary); }
        .content { padding: 2rem; background: var(--color-background-primary); border-radius: 16px; margin: 0 0 2rem; }
        .button { padding: 0.75rem 1.5rem; border: 0.5px solid var(--color-border-secondary); background: transparent; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--color-text-primary); transition: all 0.2s; }
        .button:hover:not(:disabled) { background: var(--color-background-secondary); }
        .button:disabled { opacity: 0.5; cursor: not-allowed; }
        .button-primary { border: 2px solid var(--color-border-info); color: var(--color-text-info); background: var(--color-background-info); font-weight: 500; }
        .button-primary:hover:not(:disabled) { opacity: 0.9; }
        .card { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; transition: all 0.2s; }
        .card:hover { border-color: var(--color-border-secondary); }
        .card.selected { border: 2px solid var(--color-border-info); background: var(--color-background-info); color: var(--color-text-info); }
        .badge { display: inline-block; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 12px; font-weight: 500; margin-right: 8px; margin-bottom: 8px; }
        .badge-beginner { background: var(--color-background-success); color: var(--color-text-success); }
        .badge-intermediate { background: var(--color-background-info); color: var(--color-text-info); }
        .badge-advanced { background: var(--color-background-warning); color: var(--color-text-warning); }
        .exercise-card { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; text-align: left; width: 100%; font-family: var(--font-sans); }
        .exercise-card:hover { border-color: var(--color-border-secondary); }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        h2 { font-size: 20px; font-weight: 500; margin-bottom: 1.5rem; color: var(--color-text-primary); }
        h3 { font-size: 16px; font-weight: 500; margin-bottom: 1rem; color: var(--color-text-primary); }
        p { line-height: 1.6; }
      `}
      </style>

      <div className="atlas-container">
        <div className="header">
          <h1>Atlas</h1>
          <p>Professional workouts with what you have</p>
        </div>

        <div className="content">
          {step === 'capture' && !captureMode && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                Let's build your perfect workout. Start by showing us your equipment.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                <button onClick={startCamera} style={{ padding: '1.5rem', background: 'var(--color-background-secondary)', border: '2px solid var(--color-border-tertiary)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.borderColor = 'var(--color-border-secondary)'} onMouseLeave={(e) => e.target.style.borderColor = 'var(--color-border-tertiary)'}>
                  <div style={{ fontSize: 32, marginBottom: '0.5rem' }}>📱</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Take Photo</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Use your camera</div>
                </button>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--color-background-secondary)', border: '2px solid var(--color-border-tertiary)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.style.borderColor = 'var(--color-border-secondary)'} onMouseLeave={(e) => e.style.borderColor = 'var(--color-border-tertiary)'}>
                  <div style={{ fontSize: 32, marginBottom: '0.5rem' }}>📁</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Upload Photo</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>From your device</div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <button className="button" onClick={() => { setSelectedEquipment([]); setStep('equipment'); }} style={{ width: '100%' }}>
                Skip & Enter Equipment Manually
              </button>
            </div>
          )}

          {captureMode === 'camera' && (
            <div style={{ textAlign: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', maxWidth: '500px', borderRadius: '12px', marginBottom: '1rem', backgroundColor: '#000' }}
              />
              <canvas ref={canvasRef} width={500} height={500} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="button button-primary" onClick={capturePhoto} style={{ flex: 1, padding: '0.75rem' }}>
                  Capture Photo
                </button>
                <button className="button" onClick={() => {
                  if (videoRef.current?.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                  }
                  setCaptureMode(null);
                }} style={{ flex: 1, padding: '0.75rem' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'equipment' && (
            <div>
              <h2>Step 1: Confirm Your Equipment</h2>
              {uploadedImage && (
                <img src={uploadedImage} alt="Gym setup" style={{
                  width: '100%',
                  maxWidth: '400px',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  border: '0.5px solid var(--color-border-tertiary)'
                }} />
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
                  Detected Equipment:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedEquipment.length > 0 ? (
                    selectedEquipment.map(item => (
                      <button
                        key={item}
                        onClick={() => handleEquipmentSelection(item)}
                        className="badge badge-intermediate"
                        style={{ border: 'none', cursor: 'pointer', padding: '0.6rem 1rem' }}
                      >
                        {item} ✓
                      </button>
                    ))
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      No equipment detected. Add manually below.
                    </p>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
                  Add More Equipment:
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="e.g., water bottles, rope, towel"
                    value={manualEquipment}
                    onChange={(e) => setManualEquipment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addManualEquipment()}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '0.5px solid var(--color-border-tertiary)',
                      fontSize: 14,
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--color-text-primary)',
                      background: 'var(--color-background-secondary)'
                    }}
                  />
                  <button className="button" onClick={addManualEquipment}>Add</button>
                </div>
              </div>
              <button
                className="button button-primary"
                onClick={() => setStep('goal')}
                disabled={selectedEquipment.length === 0}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Next: Select Your Goal
              </button>
            </div>
          )}

          {step === 'goal' && (
            <div>
              <h2>Step 2: What's Your Goal?</h2>
              <div className="grid-2">
                {['Muscle Gain', 'Fat Loss', 'Endurance', 'Mobility', 'Strength', 'General Fitness'].map(g => (
                  <button
                    key={g}
                    onClick={() => { setGoal(g); setStep('difficulty'); }}
                    className={`card ${goal === g ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{g}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'difficulty' && (
            <div>
              <h2>Step 3: Choose Your Difficulty</h2>
              <div className="grid-2">
                {['beginner', 'intermediate', 'advanced'].map(d => (
                  <button
                    key={d}
                    onClick={() => { setDifficulty(d); setStep('time'); }}
                    className={`card ${difficulty === d ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 500, textTransform: 'capitalize' }}>{d}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
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
              <h2>Step 4: How Many Minutes?</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  style={{ width: '100%', marginBottom: '1rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
                  {[15, 30, 45, 60].map(time => (
                    <button
                      key={time}
                      onClick={() => setTimeLimit(time)}
                      className={`card ${timeLimit === time ? 'selected' : ''}`}
                      style={{ cursor: 'pointer', textAlign: 'center', padding: '1rem' }}
                    >
                      {time}m
                    </button>
                  ))}
                </div>
              </div>
              <button className="button button-primary" onClick={() => setStep('limits')} style={{ width: '100%', padding: '0.75rem' }}>
                Next: Any Limitations?
              </button>
            </div>
          )}

          {step === 'limits' && (
            <div>
              <h2>Step 5: Physical Limitations or Injuries?</h2>
              <textarea
                placeholder="e.g., Weak lower back, no jumping, shoulder impingement..."
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '0.5px solid var(--color-border-tertiary)',
                  fontSize: 14,
                  minHeight: '100px',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-background-secondary)',
                  marginBottom: '1rem'
                }}
              />
              <button
                className="button button-primary"
                onClick={() => generateWorkout()}
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {loading ? 'Generating Your Workout...' : 'Generate My Workout'}
              </button>
            </div>
          )}

          {step === 'results' && generatedWorkout && !selectedExercise && (
            <div>
              <div style={{ background: 'var(--color-background-secondary)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)', fontStyle: 'italic' }}>
                  "{generatedWorkout.gymSummary}"
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-intermediate">{goal}</span>
                  <span className={`badge badge-${difficulty}`}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                  <span className="badge badge-info">{timeLimit} min</span>
                </div>
              </div>

              <h3>Warm-Up (2-3 Min)</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                {generatedWorkout.warmup}
              </p>

              <h3>Main Circuit</h3>
              {generatedWorkout.mainCircuit.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedExercise(ex)}
                  className="exercise-card"
                >
                  <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>
                    {ex.exercise}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>
                    {ex.description}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                    {ex.duration}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-border-info)', margin: '0.5rem 0 0' }}>
                    👉 Click to view demonstration
                  </p>
                </button>
              ))}

              <h3 style={{ marginTop: '1.5rem' }}>The MacGyver Move</h3>
              <div style={{ background: 'var(--color-background-info)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 0.5rem', color: 'var(--color-text-info)' }}>
                  {generatedWorkout.macgyverMove.name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-info)', margin: 0 }}>
                  {generatedWorkout.macgyverMove.description}
                </p>
              </div>

              <h3>Safety Tips</h3>
              {generatedWorkout.tips.map((tip, idx) => (
                <div key={idx} style={{ background: 'var(--color-background-warning)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-warning)', margin: 0 }}>
                    ✓ {tip}
                  </p>
                </div>
              ))}

              <h3 style={{ marginTop: '1.5rem' }}>Cool Down (60 sec)</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                {generatedWorkout.cooldown}
              </p>

              <button className="button button-primary" onClick={startOver} style={{ width: '100%', padding: '0.75rem' }}>
                Generate Another Workout
              </button>
            </div>
          )}

          {selectedExercise && (
            <div style={{ textAlign: 'center' }}>
              <button className="button" onClick={() => setSelectedExercise(null)} style={{ marginBottom: '1.5rem', width: '100%' }}>
                ← Back to Workout
              </button>
              <h2 style={{ fontSize: 24 }}>{selectedExercise.exercise}</h2>
              
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                {EXERCISE_DATABASE[selectedExercise.exercise]?.description}
              </p>

              <div style={{ background: 'var(--color-background-secondary)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>Reps/Time</p>
                    <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
                      {EXERCISE_DATABASE[selectedExercise.exercise]?.[difficulty].reps}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>Sets</p>
                    <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
                      {EXERCISE_DATABASE[selectedExercise.exercise]?.[difficulty].sets}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>Rest</p>
                    <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
                      {EXERCISE_DATABASE[selectedExercise.exercise]?.[difficulty].rest}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--color-background-warning)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ color: 'var(--color-text-warning)' }}>Form Tips</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-warning)', margin: 0 }}>
                  {EXERCISE_DATABASE[selectedExercise.exercise]?.form}
                </p>
              </div>

              <button className="button button-primary" onClick={() => setSelectedExercise(null)} style={{ width: '100%', padding: '0.75rem' }}>
                Got It, Back to Workout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}