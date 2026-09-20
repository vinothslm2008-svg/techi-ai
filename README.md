# Techi - Standalone AI Voice Assistant

Techi is a voice-only AI assistant built with Web Speech API, Gemini API, YouTube Data & IFrame API, OpenRouteService, and Nominatim.

## Features & Scope Compliance

- **Single Minimalist Visual Element**: Features ONLY a full-screen minimalist dark interface with a single animated canvas AI Orb and a "Tap to start" initial permission overlay.
- **Voice-First Everything**: No buttons, no chat text, no maps, no video frames. Output is spoken via browser Speech Synthesis.
- **Multilingual Support**: Understands and replies in Tamil, Tanglish, and English.
- **Music (YouTube Audio)**: Search, queue (10 songs), play, pause, resume, next, volume control, auto-ducking while Techi speaks, and mood-based music integration.
- **Navigation (OpenRouteService & Nominatim)**: Voice turn-by-turn routing, distance check ("evlo dhooram"), and live geolocation tracking without any map display.
- **Calling**: Editable `contacts.json` phone lookup triggering `tel:<number>` dialer links.
- **Voice Errors**: Mic denied, missing API keys, or network failures are reported aloud by Techi.

---

## Setup & Run Steps

### 1. Environment Configuration
Copy `.env.example` to `.env` and insert your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
ORS_API_KEY=your_openrouteservice_api_key_here
PORT=3000
```

### 2. Install Dependencies & Start Server
Run the following commands in your terminal:

```bash
npm install
npm start
```

Open your browser (Google Chrome recommended) at: `http://localhost:3000`

---

## How to use `window.techi` API

You can interact with Techi programmatically via the global `window.techi` object:

### 1. Feeding Telemetry Data (`techi.updateData`)

Update vehicle or driver sensor state:

```javascript
// Feed sensor metrics to Techi
window.techi.updateData({
  battery: 85,          // Battery percentage
  range: 310,           // Estimated range in KM
  motorTemp: 42,        // Motor temp in Celsius
  rpm: 2400,            // Motor RPM
  heartRate: 75,        // Driver heart rate
  fatigueLevel: "Low",  // Low, Medium, High
  mood: "tired"         // Will trigger energetic mood-based music!
});
```

### 2. Triggering Spoken Alerts (`techi.speak`)

Make Techi speak any custom announcement by voice:

```javascript
// Trigger a voice alert
window.techi.speak("Warning: Battery level is below 15 percent. Please find a charging station.");
```

### 3. Fetching Status (`techi.getStatus`)

Retrieve current system state:

```javascript
console.log(window.techi.getStatus());
```

---

## Supported Voice Commands

### Music
- *"play Anirudh songs"* / *"oru melody song podu"*
- *"next song"* / *"adutha paatu"*
- *"pause"* / *"resume"* / *"stop"*
- *"volume kammi pannu"* / *"volume athigam pannu"*

### Navigation
- *"Coimbatore-ku route sollu"* / *"nearest petrol bunk"*
- *"evlo dhooram"*
- *"navigation stop"*

### Calling
- *"amma-ku call pannu"* / *"appa-ku call pannu"*

### Chat & General
- *"Hi Techi epdi irukke"*
- *"What is your name?"*
