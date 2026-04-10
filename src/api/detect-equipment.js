// api/detect-equipment.js
// Detects gym equipment from images using Claude Vision API

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Check if API key exists
  if (!process.env.CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set in environment');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Clean up the base64 if it has data: prefix
    let base64Data = imageBase64;
    if (imageBase64.includes('base64,')) {
      base64Data = imageBase64.split('base64,')[1];
    }

    // Call Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
      },
      body: JSON.stringify({
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
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: `Look at this gym or exercise space image and identify ALL visible fitness equipment and items that can be used for working out. Be specific and accurate.

List equipment like:
- Specific weights (dumbbells, kettlebells, barbells)
- Machines (treadmill, squat rack, bench press)
- Equipment (resistance bands, yoga mat, medicine balls, ropes)
- Furniture that can be used (benches, chairs, boxes)
- Other items (water bottles, mirrors, bars)

Return ONLY a JSON array of equipment names, nothing else. Example format:
["dumbbells", "barbell", "bench", "resistance bands", "pull-up bar"]

If no gym equipment visible, return the most likely bodyweight exercise options:
["dumbbells", "resistance bands", "bodyweight exercises"]`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      
      // Fallback to defaults if API fails
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
        note: 'Using defaults due to detection error'
      });
    }

    const data = await response.json();
    const textContent = data.content[0]?.text || '';

    // Parse the JSON response
    try {
      const equipment = JSON.parse(textContent);
      
      // Validate it's an array
      if (Array.isArray(equipment) && equipment.length > 0) {
        return res.status(200).json({ equipment });
      } else {
        throw new Error('Invalid equipment format');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Response text:', textContent);
      
      // Fallback to defaults
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
        note: 'Could not parse detection'
      });
    }

  } catch (error) {
    console.error('Equipment detection error:', error);
    
    // Always return defaults instead of error
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
      note: 'Detection failed, using defaults'
    });
  }
}