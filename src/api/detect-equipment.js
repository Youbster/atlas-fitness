// api/detect-equipment.js
// Equipment detection using Claude Vision API - FIXED VERSION

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
    // Extract pure base64 (remove data:image/jpeg;base64, prefix if present)
    let pureBase64 = imageBase64;
    if (imageBase64.includes(',')) {
      pureBase64 = imageBase64.split(',')[1];
    }

    // Claude Vision API expects clean base64 without any prefix
    const requestBody = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
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
              text: 'What gym equipment do you see in this image? List all visible fitness equipment like dumbbells, barbells, benches, machines, resistance bands, kettlebells, etc. Return ONLY a JSON array of equipment names like: ["dumbbells", "barbell", "bench press", "resistance bands"]. If no gym equipment visible, return: ["dumbbells", "resistance bands", "bodyweight exercises"]',
            },
          ],
        },
      ],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      
      // Return defaults instead of error
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
        error: 'Detection API error, using defaults',
      });
    }

    const data = await response.json();
    const textContent = data.content[0]?.text || '';

    // Try to parse the JSON response
    try {
      const equipment = JSON.parse(textContent);
      
      if (Array.isArray(equipment) && equipment.length > 0) {
        return res.status(200).json({ equipment });
      } else {
        throw new Error('Invalid equipment array');
      }
    } catch (parseErr) {
      console.error('Parse error:', parseErr, 'Response:', textContent);
      
      // Return defaults
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
        error: 'Could not parse equipment',
      });
    }

  } catch (error) {
    console.error('Detection error:', error);
    
    // Always return defaults instead of failing
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
      error: error.message,
    });
  }
}