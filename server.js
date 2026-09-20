const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Contacts API
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

app.get('/api/contacts', (req, res) => {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read contacts' });
  }
});

app.post('/api/contacts', (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone required' });
    }
    let contacts = [];
    if (fs.existsSync(CONTACTS_FILE)) {
      contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
    }
    contacts.push({ name, aliases: [name.toLowerCase()], phone });
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    return res.json({ success: true, contacts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save contact' });
  }
});

// Gemini Brain Proxy Endpoint
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    return res.json({
      speech: "Gemini API key is missing in the env file. Please configure it.",
      error: "MISSING_GEMINI_KEY"
    });
  }

  const { message, telemetry } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const systemInstruction = `You are Techi, a friendly, ultra-smart JARVIS-like AI voice assistant in a car.
STRICT RULES:
1. Replies MUST be very short (1 to 2 sentences maximum).
2. Respond in the same language/script style as the user: Tamil, Tanglish (Tamil in English script like "epdi irukinga", "super bro"), or English.
3. You possess vast General Knowledge across science, history, geography, sports, cinema, tech, and general trivia. Answer any general knowledge question accurately and concisely.
4. Determine intent and return ONLY valid JSON matching this schema:
{
  "intent": "chat" | "music" | "navigation" | "call" | "status",
  "speech": "Short spoken response text to say to user",
  "action": {
    "type": "play_music" | "next_music" | "pause_music" | "resume_music" | "stop_music" | "volume_down" | "volume_up" | "route" | "google_maps" | "distance" | "stop_nav" | "make_call" | "none",
    "query": "search term or place name or contact name if applicable"
  }
}

EXAMPLES:
- User: "Who is the Prime Minister of India?" -> {"intent":"chat","speech":"Narendra Modi is the current Prime Minister of India bro.","action":{"type":"none","query":""}}
- User: "Tamil Nadu capital enna?" -> {"intent":"chat","speech":"Chennai dhaan Tamil Nadu oda capital bro!","action":{"type":"none","query":""}}
- User: "Why is the sky blue?" -> {"intent":"chat","speech":"Sunlight scatters through gases in the atmosphere, and blue light scatters the most!","action":{"type":"none","query":""}}
- User: "Thirukkural yaaru eluthuna?" -> {"intent":"chat","speech":"Thiruvalluvar dhaan Thirukkuralai ezhuthinar.","action":{"type":"none","query":""}}
- User: "Earth oda distance from Sun evlo?" -> {"intent":"chat","speech":"Earth Sun kitta irundhu approximately 150 million kilometers dhooram irukku.","action":{"type":"none","query":""}}
- User: "oru melody song podu" -> {"intent":"music","speech":"Kandippa, oru nalla melody song podren.","action":{"type":"play_music","query":"Tamil melody songs"}}
- User: "Coimbatore ku route sollu" -> {"intent":"navigation","speech":"Coimbatore ku route theredukren.","action":{"type":"route","query":"Coimbatore"}}
- User: "amma ku call pannu" -> {"intent":"call","speech":"Amma ku call panren.","action":{"type":"make_call","query":"Amma"}}
- User: "Hi Techi epdi irukke" -> {"intent":"chat","speech":"Nalla irukken bro! Neenga epdi irukinga? Enna venum nalaum sollunga.","action":{"type":"none","query":""}}
 
Current telemetry data available: ${JSON.stringify(telemetry || {})}.
ALWAYS return strict raw JSON without markdown formatting code blocks.`;

  const models = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nUser input: "${message}"` }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    let response = null;
    let lastErrText = "";

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          break; // Success! Break out of model fallback loop
        } else {
          lastErrText = await response.text();
          console.warn(`Model ${model} returned status ${response.status}. Trying next model fallback...`);
        }
      } catch (e) {
        console.warn(`Model ${model} fetch failed:`, e.message);
      }
    }

    if (!response || !response.ok) {
      console.error("All Gemini model fallbacks exhausted:", lastErrText);
      return res.json({
        speech: "AI brain is currently experiencing high demand. Please wait a moment.",
        error: "GEMINI_API_ERROR",
        detail: lastErrText
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      return res.json({
        speech: "Sorry, I couldn't process that response.",
        error: "NO_RESPONSE"
      });
    }

    let parsed = null;
    try {
      const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(candidateText.replace(/```json|```/g, '').trim());
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw candidate text:", candidateText);
      parsed = {
        intent: "chat",
        speech: candidateText.replace(/[\{\}"]/g, '').slice(0, 100),
        action: { type: "none", query: "" }
      };
    }
    return res.json(parsed);

  } catch (err) {
    console.error("Chat backend error:", err);
    return res.json({
      speech: "Sorry, I encountered an issue connecting to the AI brain.",
      error: "SERVER_ERROR"
    });
  }
});

// YouTube Data API Proxy
app.get('/api/youtube/search', async (req, res) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_youtube_api_key')) {
    return res.json({
      error: "MISSING_YOUTUBE_KEY",
      speech: "YouTube API key is missing. Cannot search songs."
    });
  }

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Search query required" });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&type=video&q=${encodeURIComponent(query)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      if (data.error.code === 403 || data.error.message?.includes('quota')) {
        return res.json({
          error: "QUOTA_EXCEEDED",
          speech: "YouTube API quota has been exceeded for today."
        });
      }
      return res.json({
        error: "YOUTUBE_ERROR",
        speech: "Failed to search YouTube. " + (data.error.message || "")
      });
    }

    const items = (data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle
    }));

    if (items.length === 0) {
      return res.json({
        error: "NOT_FOUND",
        speech: "No songs found for " + query,
        items: []
      });
    }

    return res.json({ items });
  } catch (err) {
    console.error("YouTube search error:", err);
    return res.json({
      error: "YOUTUBE_FETCH_FAILED",
      speech: "Network error searching YouTube."
    });
  }
});

// Nominatim Geocoding Proxy
app.get('/api/navigation/geocode', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TechiVoiceAssistant/1.0' }
    });
    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json({ error: "PLACE_NOT_FOUND", speech: `Place ${query} not found.` });
    }

    return res.json({
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name
    });
  } catch (err) {
    console.error("Geocode error:", err);
    return res.json({ error: "GEOCODE_FAILED", speech: "Error searching location." });
  }
});

// OpenRouteService Directions Proxy
app.get('/api/navigation/route', async (req, res) => {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openrouteservice_api_key')) {
    return res.json({
      error: "MISSING_ORS_KEY",
      speech: "OpenRouteService API key is missing in env file."
    });
  }

  const { startLng, startLat, endLng, endLat } = req.query;
  if (!startLng || !startLat || !endLng || !endLat) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.json({
        error: "ORS_ERROR",
        speech: "Could not calculate route. " + (data.error.message || "")
      });
    }

    const route = data.features?.[0];
    if (!route) {
      return res.json({ error: "NO_ROUTE", speech: "No route found to destination." });
    }

    const segments = route.properties.segments[0];
    const steps = segments.steps.map(step => ({
      distance: step.distance,
      instruction: step.instruction,
      type: step.type,
      name: step.name
    }));

    return res.json({
      totalDistance: segments.distance, // meters
      totalDuration: segments.duration, // seconds
      steps: steps
    });
  } catch (err) {
    console.error("ORS route error:", err);
    return res.json({ error: "ROUTE_FETCH_FAILED", speech: "Failed to fetch directions." });
  }
});

app.listen(PORT, () => {
  console.log(`Techi server running at http://localhost:${PORT}`);
});
