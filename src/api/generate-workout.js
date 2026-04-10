// api/generate-workout.js
// Place this in your Vercel project at: api/generate-workout.js

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { equipment, goal, difficulty, timeLimit, limitations } = req.body;

  // Validate input
  if (!equipment || !goal || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY, // Secure! Only on server
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: `Generate a ${difficulty} difficulty workout using ONLY: ${equipment.join(', ')}. Goal: ${goal}. Time: ${timeLimit}min. Limitations: ${limitations || 'None'}.

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
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      return res.status(response.status).json({
        error: 'Failed to generate workout',
        details: error.error?.message || 'Unknown error',
      });
    }

    const data = await response.json();
    const jsonText = data.content[0].text;

    // Parse the JSON response
    const workout = JSON.parse(jsonText);

    return res.status(200).json(workout);
  } catch (error) {
    console.error('Workout generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate workout',
      details: error.message,
    });
  }
}