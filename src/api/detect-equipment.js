// api/detect-equipment.js
// Place this in your Vercel project at: api/detect-equipment.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    // Send to Claude Vision API for analysis
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64.split(',')[1] || imageBase64, // Remove data:image/jpeg;base64, prefix if present
                },
              },
              {
                type: 'text',
                text: 'Analyze this gym/equipment image. List ALL visible fitness equipment and items that can be used for exercise. Include: dumbbells, barbells, benches, machines, resistance bands, ropes, kettlebells, weight plates, pull-up bars, medicine balls, yoga mats, foam rollers, water bottles, towels, chairs, walls, stairs, or any other usable items. Return ONLY a JSON array of equipment names, nothing else. Example: ["dumbbells", "resistance bands", "pull-up bar"]. If no gym equipment visible, suggest common bodyweight exercise options like "space for jumping", "floor for exercises".',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude Vision API error:', error);
      return res.status(response.status).json({
        error: 'Failed to analyze image',
        details: error.error?.message || 'Unknown error',
      });
    }

    const data = await response.json();
    const detectedText = data.content[0].text;

    // Parse the JSON response
    try {
      const equipment = JSON.parse(detectedText);
      return res.status(200).json({ equipment: Array.isArray(equipment) ? equipment : [equipment] });
    } catch (parseError) {
      // If parsing fails, try to extract equipment from text
      console.error('JSON parse error:', parseError);
      const equipmentList = detectedText.split(',').map(e => e.trim().replace(/["'\[\]]/g, '')).filter(e => e.length > 0);
      return res.status(200).json({ equipment: equipmentList || ['dumbbells', 'resistance bands'] });
    }
  } catch (error) {
    console.error('Equipment detection error:', error);
    return res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message,
    });
  }
}