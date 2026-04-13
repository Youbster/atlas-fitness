// api/generate-workout.js
// Generate custom workout - FIXED JSON parsing

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { equipment, goal, difficulty, timeLimit, limitations } = req.body;

  if (!equipment || !goal || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `Create a ${difficulty} difficulty workout for ${goal} using only: ${equipment.join(', ')}. Duration: ${timeLimit} minutes. Limitations: ${limitations || 'none'}.

Respond with ONLY a JSON object (no markdown, no code blocks, no extra text):
{
  "gymSummary": "One witty sentence about this workout",
  "warmup": "Brief 2-3 minute warm-up description",
  "mainCircuit": [
    {"exercise": "Exercise Name", "description": "What it targets", "duration": "10 reps or 30 seconds"},
    {"exercise": "Another Exercise", "description": "What it targets", "duration": "12 reps or 45 seconds"}
  ],
  "cooldown": "Brief cool down description",
  "tips": ["Safety tip 1", "Safety tip 2"],
  "macgyverMove": {"name": "Creative Exercise", "description": "How to perform it"}
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      return res.status(200).json({
        gymSummary: 'Time to get fit!',
        warmup: 'Do some light cardio or dynamic stretches for 2-3 minutes.',
        mainCircuit: [
          { exercise: 'Dumbbell Squats', description: 'Lower body strength', duration: '12 reps × 3 sets' },
          { exercise: 'Push-ups', description: 'Upper body strength', duration: '10 reps × 3 sets' },
          { exercise: 'Dumbbell Rows', description: 'Back strength', duration: '12 reps × 3 sets' },
        ],
        cooldown: 'Walk around and stretch for 1-2 minutes.',
        tips: ['Stay hydrated', 'Rest 60 seconds between sets'],
        macgyverMove: { name: 'Towel Rows', description: 'Use a towel as resistance for rows' },
      });
    }

    const data = await response.json();
    let rawText = (data.content[0]?.text || '').trim();

    console.log('Raw response:', rawText.substring(0, 200));

    // Remove markdown code blocks if present
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

    // Try to extract JSON object
    let workout = null;

    // Look for { ... } pattern
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        workout = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed workout');
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
      }
    }

    // If we got valid workout, return it
    if (workout && workout.mainCircuit && Array.isArray(workout.mainCircuit)) {
      return res.status(200).json(workout);
    }

    // Fallback workout if parsing fails
    console.log('Using fallback workout');
    return res.status(200).json({
      gymSummary: 'Time to get fit!',
      warmup: 'Do some light cardio or dynamic stretches for 2-3 minutes.',
      mainCircuit: [
        { exercise: 'Dumbbell Squats', description: 'Lower body strength', duration: '12 reps × 3 sets' },
        { exercise: 'Push-ups', description: 'Upper body strength', duration: '10 reps × 3 sets' },
        { exercise: 'Dumbbell Rows', description: 'Back strength', duration: '12 reps × 3 sets' },
      ],
      cooldown: 'Walk around and stretch for 1-2 minutes.',
      tips: ['Stay hydrated', 'Rest 60 seconds between sets'],
      macgyverMove: { name: 'Towel Rows', description: 'Use a towel as resistance for rows' },
    });

  } catch (error) {
    console.error('Workout generation error:', error);
    
    // Return a fallback workout instead of error
    return res.status(200).json({
      gymSummary: 'Time to get fit!',
      warmup: 'Do some light cardio or dynamic stretches for 2-3 minutes.',
      mainCircuit: [
        { exercise: 'Dumbbell Squats', description: 'Lower body strength', duration: '12 reps × 3 sets' },
        { exercise: 'Push-ups', description: 'Upper body strength', duration: '10 reps × 3 sets' },
        { exercise: 'Dumbbell Rows', description: 'Back strength', duration: '12 reps × 3 sets' },
      ],
      cooldown: 'Walk around and stretch for 1-2 minutes.',
      tips: ['Stay hydrated', 'Rest 60 seconds between sets'],
      macgyverMove: { name: 'Towel Rows', description: 'Use a towel as resistance for rows' },
    });
  }
}