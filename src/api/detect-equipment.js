// api/detect-equipment.js
// Equipment detection using Claude Vision API - JSON FIX

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Extract pure base64
    let pureBase64 = imageBase64;
    if (imageBase64.includes(',')) {
      pureBase64 = imageBase64.split(',')[1];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: pureBase64,
                },
              },
              {
                type: 'text',
                text: 'Analyze this gym image. List ALL visible fitness equipment. You MUST respond with ONLY a JSON array. No other text. No markdown. Just the array.\n\nExample response:\n["dumbbells", "barbell", "bench", "treadmill"]\n\nIf no gym equipment, respond:\n["dumbbells", "resistance bands", "bodyweight exercises"]\n\nRespond with ONLY the JSON array, nothing else.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
      });
    }

    const data = await response.json();
    const textContent = (data.content[0]?.text || '').trim();

    console.log('Raw response:', textContent);

    // Try to extract JSON array from response
    let equipment = null;
    
    // Try direct parse first
    try {
      equipment = JSON.parse(textContent);
    } catch (e) {
      // If it fails, try to find JSON array in the text
      const jsonMatch = textContent.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          equipment = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Could not parse JSON:', e2);
        }
      }
    }

    // If we got valid equipment array, return it
    if (Array.isArray(equipment) && equipment.length > 0) {
      return res.status(200).json({ equipment });
    }

    // Fallback to defaults
    console.log('No valid equipment detected, using defaults');
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
    });

  } catch (error) {
    console.error('Detection error:', error);
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
    });
  }
}