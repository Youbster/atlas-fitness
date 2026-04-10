// api/detect-equipment.js
// Equipment detection with detailed logging for debugging

export default async function handler(req, res) {
  console.log('[DETECT] Request method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;
  console.log('[DETECT] Image received:', imageBase64 ? `${imageBase64.length} bytes` : 'none');

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  console.log('[DETECT] API Key exists:', apiKey ? 'yes' : 'NO - THIS IS THE PROBLEM');
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'CLAUDE_API_KEY not set in Vercel environment variables',
      solution: 'Go to Vercel dashboard → Settings → Environment Variables → Add CLAUDE_API_KEY'
    });
  }

  try {
    // Clean base64
    let base64Data = imageBase64;
    if (imageBase64.includes('base64,')) {
      base64Data = imageBase64.split('base64,')[1];
    }
    
    console.log('[DETECT] Cleaned base64 length:', base64Data.length);
    console.log('[DETECT] Calling Claude API with model: claude-3-5-sonnet-20241022');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
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
                text: 'Identify ALL gym equipment visible in this image. Return ONLY a JSON array like: ["dumbbells", "barbell", "bench"]. If no gym equipment, return: ["dumbbells", "resistance bands", "bodyweight exercises"]',
              },
            ],
          },
        ],
      }),
    });

    console.log('[DETECT] Claude API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[DETECT] Claude API error:', error);
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
        error: 'Detection failed, using defaults',
        details: error
      });
    }

    const data = await response.json();
    console.log('[DETECT] Claude response:', data);
    
    const textContent = data.content[0]?.text || '';
    console.log('[DETECT] Text content:', textContent);

    try {
      const equipment = JSON.parse(textContent);
      console.log('[DETECT] Parsed equipment:', equipment);
      
      if (Array.isArray(equipment) && equipment.length > 0) {
        console.log('[DETECT] Success! Equipment detected:', equipment);
        return res.status(200).json({ equipment });
      } else {
        throw new Error('Invalid format');
      }
    } catch (parseError) {
      console.error('[DETECT] Parse error:', parseError);
      return res.status(200).json({
        equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
        error: 'Could not parse response'
      });
    }

  } catch (error) {
    console.error('[DETECT] Fatal error:', error);
    return res.status(200).json({
      equipment: ['dumbbells', 'resistance bands', 'bodyweight exercises'],
      error: error.message
    });
  }
}