// api/detect-equipment.js
// Equipment detection - FINAL VERSION with robust JSON parsing

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
        max_tokens: 100,
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
                text: 'IMPORTANT: Respond with ONLY a JSON array. No markdown. No code blocks. No explanation.\n\nList all visible gym equipment in this image:\n["item1", "item2", "item3"]\n\nIf no gym equipment visible:\n["dumbbells", "resistance bands", "bodyweight exercises"]',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error:', errorData);
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
      });
    }

    const data = await response.json();
    let textContent = (data.content[0]?.text || '').trim();

    console.log('Raw response:', textContent);

    // Remove markdown code blocks if present
    textContent = textContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

    // Extract JSON array - look for [ ... ]
    let equipment = null;
    
    // Try to find JSON array pattern
    const arrayMatch = textContent.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        equipment = JSON.parse(arrayMatch[0]);
        console.log('Parsed equipment:', equipment);
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e);
      }
    }

    // If we got a valid array, return it
    if (Array.isArray(equipment) && equipment.length > 0) {
      return res.status(200).json({ equipment });
    }

    // Fallback
    console.log('Using fallback equipment');
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
    });
  }
}