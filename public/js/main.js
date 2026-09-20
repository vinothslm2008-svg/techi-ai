document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Components
  const orb = new TechiOrb('orb-canvas');
  const voice = new TechiVoice();

  const musicAgent = new MusicAgent();
  const navAgent = new NavAgent();
  const callAgent = new CallAgent();

  const batteryAgent = new BatteryAgent();
  const motorAgent = new MotorAgent();
  const wellnessAgent = new DriverWellnessAgent();

  const overlay = document.getElementById('start-overlay');

  const stateBadge = document.getElementById('state-badge');
  const songBadge = document.getElementById('song-badge');
  const songTitle = document.getElementById('song-title');
  const navBadge = document.getElementById('nav-badge');
  const navInfo = document.getElementById('nav-info');

  // Sync state transitions to orb visual animation and UI badge
  voice.onStateChangeCallback = (state) => {
    orb.setState(state);
    if (state === 'listening') {
      stateBadge.textContent = '🎙️ Listening...';
    } else if (state === 'thinking') {
      stateBadge.textContent = '🧠 Processing...';
    } else if (state === 'speaking') {
      stateBadge.textContent = '🗣️ Speaking...';
    } else {
      stateBadge.textContent = '🎙️ Ready';
    }
  };

  // UI Status update helpers
  function updateSongUI(title) {
    if (title) {
      songTitle.textContent = title;
      songBadge.classList.remove('hidden');
    } else {
      songBadge.classList.add('hidden');
    }
  }

  function updateNavUI(dest, dist) {
    if (dest) {
      navInfo.textContent = `Route: ${dest} ${dist ? '(' + dist + ')' : ''}`;
      navBadge.classList.remove('hidden');
    } else {
      navBadge.classList.add('hidden');
    }
  }

  // Hook into musicAgent to update UI on track change
  const originalPlayCurrentTrack = musicAgent.playCurrentTrack.bind(musicAgent);
  musicAgent.playCurrentTrack = () => {
    originalPlayCurrentTrack();
    if (musicAgent.queue[musicAgent.currentIndex]) {
      updateSongUI(musicAgent.queue[musicAgent.currentIndex].title);
    }
  };

  const originalStopMusic = musicAgent.stop.bind(musicAgent);
  musicAgent.stop = () => {
    originalStopMusic();
    updateSongUI(null);
  };

  // Hook into navAgent to update UI on route change
  const originalStartRoute = navAgent.startRoute.bind(navAgent);
  navAgent.startRoute = async (destination, voiceEngine) => {
    const res = await originalStartRoute(destination, voiceEngine);
    if (res && navAgent.activeRoute) {
      const distKm = (navAgent.activeRoute.totalDistance / 1000).toFixed(1) + ' km';
      updateNavUI(destination, distKm);
    }
    return res;
  };

  const originalStopNav = navAgent.stopNavigation.bind(navAgent);
  navAgent.stopNavigation = (voiceEngine) => {
    originalStopNav(voiceEngine);
    updateNavUI(null);
  };

  // Music Auto-ducking when Techi speaks
  voice.onSpeechStartCallback = () => {
    musicAgent.setDucked(true);
  };

  voice.onSpeechEndCallback = () => {
    musicAgent.setDucked(false);
  };

  // Main Speech Result Handler
  voice.onResultCallback = async (transcript) => {
    console.log("Recognized Speech:", transcript);
    orb.setState('thinking');
    stateBadge.textContent = '🧠 Processing...';

    const lower = transcript.toLowerCase();

    // Fast Regex Intent Router for instant zero-latency controls
    if (lower.includes('next song') || lower.includes('adutha paatu') || lower.includes('adutha pattu')) {
      const track = musicAgent.playNextTrack();
      if (track) {
        updateSongUI(track.title);
        voice.speak(`Playing next track ${track.title}`);
      } else {
        voice.speak("No next song in queue.");
      }
      return;
    }

    if (lower === 'pause' || lower.includes('pause song') || lower.includes('paatu niruthu')) {
      musicAgent.pause();
      voice.speak("Song paused.");
      return;
    }

    if (lower === 'resume' || lower === 'play' || lower.includes('resume song') || lower.includes('marupadiyum podu')) {
      musicAgent.resume();
      voice.speak("Resuming song.");
      return;
    }

    if (lower === 'stop' || lower.includes('stop music') || lower.includes('stop song')) {
      musicAgent.stop();
      updateSongUI(null);
      voice.speak("Music stopped.");
      return;
    }

    if (lower.includes('volume kammi') || lower.includes('volume kurai') || lower.includes('volume down')) {
      musicAgent.setVolume(30);
      voice.speak("Volume lowered.");
      return;
    }

    if (lower.includes('volume athigam') || lower.includes('volume koottu') || lower.includes('volume up')) {
      musicAgent.setVolume(100);
      voice.speak("Volume set to maximum.");
      return;
    }

    if (lower.includes('navigation stop') || lower.includes('stop navigation') || lower.includes('route stop')) {
      navAgent.stopNavigation(voice);
      updateNavUI(null);
      return;
    }

    if (lower.includes('evlo dhooram') || lower.includes('how far') || lower.includes('remaining distance')) {
      navAgent.getDistanceSummary(voice);
      return;
    }

    // Google Maps Voice Commands
    if (lower.includes('google map') || lower.includes('google maps') || lower.includes('show in google map')) {
      let targetDest = transcript.replace(/show in google map|google maps|google map|direction sollu|route|sollu|show/gi, '').trim();
      navAgent.openGoogleMaps(targetDest, voice);
      return;
    }

    // Quick regex for play music commands (e.g. "oru melody song podu", "Anirudh song podu")
    if (lower.includes('song podu') || lower.includes('pattu podu') || lower.includes('paatu podu') || lower.startsWith('play ')) {
      let songQuery = transcript.replace(/song podu|pattu podu|paatu podu|oru|podu|play/gi, '').trim();
      if (!songQuery) songQuery = "Tamil hit songs";
      voice.speak(`Kandippa, ${songQuery} song podren.`, () => {
        musicAgent.searchAndPlay(songQuery, voice);
      });
      return;
    }

    // Quick regex for call commands (e.g. "amma ku call pannu", "call appa")
    if (lower.includes('call pannu') || lower.includes('call panu') || lower.startsWith('call ')) {
      let contactQuery = transcript.replace(/call pannu|call panu|ku call|call/gi, '').trim();
      callAgent.makeCall(contactQuery, voice);
      return;
    }

    // Quick regex for route commands (e.g. "Coimbatore ku route sollu", "route to Chennai")
    if (lower.includes('route sollu') || lower.includes('route to')) {
      let destQuery = transcript.replace(/route sollu|route to|ku route|ku|route/gi, '').trim();
      if (destQuery) {
        voice.speak(`${destQuery}-ku route set panren.`, () => {
          navAgent.startRoute(destQuery, voice);
        });
        return;
      }
    }

    // Call Gemini API Brain for NLP Intent Processing and Conversational AI
    const telemetryData = {
      battery: batteryAgent.getStatus(),
      motor: motorAgent.getStatus(),
      wellness: wellnessAgent.getStatus()
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcript, telemetry: telemetryData })
      });

      const resData = await response.json();

      if (resData.error && resData.speech) {
        voice.speak(resData.speech);
        return;
      }

      // Handle Spoken Response
      const spokenText = resData.speech || "I didn't quite catch that.";

      // Route Action to appropriate mini-agent
      const action = resData.action;
      if (action) {
        if (action.type === 'play_music') {
          voice.speak(spokenText, () => {
            musicAgent.searchAndPlay(action.query, voice);
          });
          return;
        } else if (action.type === 'next_music') {
          const trk = musicAgent.playNextTrack();
          if (trk) updateSongUI(trk.title);
          voice.speak(spokenText);
          return;
        } else if (action.type === 'pause_music') {
          musicAgent.pause();
          voice.speak(spokenText);
          return;
        } else if (action.type === 'resume_music') {
          musicAgent.resume();
          voice.speak(spokenText);
          return;
        } else if (action.type === 'stop_music') {
          musicAgent.stop();
          updateSongUI(null);
          voice.speak(spokenText);
          return;
        } else if (action.type === 'route') {
          voice.speak(spokenText, () => {
            navAgent.startRoute(action.query, voice);
          });
          return;
        } else if (action.type === 'google_maps') {
          navAgent.openGoogleMaps(action.query, voice);
          return;
        } else if (action.type === 'distance') {
          navAgent.getDistanceSummary(voice);
          return;
        } else if (action.type === 'stop_nav') {
          navAgent.stopNavigation(voice);
          updateNavUI(null);
          return;
        } else if (action.type === 'make_call') {
          callAgent.makeCall(action.query, voice);
          return;
        }
      }

      // Default Chat Response
      voice.speak(spokenText);

    } catch (err) {
      console.error("Main agent routing error:", err);
      voice.speak("Sorry, I could not process your voice command right now.");
    }
  };

  // Start Overlay Click Event (Initial Tap to grant Mic & Audio permission)
  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden');
    voice.startListening();
    voice.speak("Hello! I am Techi, your AI assistant. How can I help you today?");
  });

  // Global Interface Exposure as required by specification
  window.techi = {
    updateData: (data) => {
      if (!data) return;
      batteryAgent.update(data);
      motorAgent.update(data);
      wellnessAgent.update(data);

      if (data.mood) {
        musicAgent.handleMoodMusic(data.mood, voice);
      }
    },
    speak: (text) => {
      voice.speak(text);
    },
    getStatus: () => ({
      battery: batteryAgent.getStatus(),
      motor: motorAgent.getStatus(),
      wellness: wellnessAgent.getStatus(),
      isNavigating: navAgent.isNavigating,
      isPlayingMusic: musicAgent.isPlaying
    })
  };
});
