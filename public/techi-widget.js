(function() {
  if (window.TechiAIWidgetLoaded) return;
  window.TechiAIWidgetLoaded = true;

  // Detect backend origin
  const scriptTag = document.currentScript;
  const backendOrigin = scriptTag ? new URL(scriptTag.src).origin : window.location.origin;

  // Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    #techi-widget-container {
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #techi-widget-fab {
      width: 56px; height: 56px; border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #00e5a0, #0084ff);
      box-shadow: 0 4px 25px rgba(0, 229, 160, 0.6); border: 2px solid #090d12;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 24px; transition: transform 0.3s ease;
    }
    #techi-widget-fab:hover { transform: scale(1.1); }
    #techi-widget-fab.listening {
      background: radial-gradient(circle at 35% 35%, #ff79c6, #b388ff);
      box-shadow: 0 0 30px rgba(255, 121, 198, 0.9); animation: techiPulse 1s infinite alternate;
    }
    #techi-widget-fab.speaking {
      background: radial-gradient(circle at 35% 35%, #00e5a0, #ffd166);
      box-shadow: 0 0 35px rgba(255, 209, 102, 0.95); animation: techiPulse 0.5s infinite alternate;
    }
    @keyframes techiPulse { from { transform: scale(0.95); } to { transform: scale(1.15); } }

    #techi-widget-panel {
      display: none; position: absolute; bottom: 70px; right: 0;
      width: 320px; background: #0f1722; border: 1px solid #223042;
      border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      overflow: hidden; flex-direction: column; color: #eef3f7;
    }
    #techi-widget-panel.open { display: flex; }
    .techi-w-header {
      background: #17212e; padding: 12px 14px; display: flex;
      align-items: center; justify-content: space-between; font-weight: 700; font-size: 13px;
      border-bottom: 1px solid #223042;
    }
    .techi-w-body { padding: 14px; font-size: 13px; max-height: 240px; overflow-y: auto; }
    .techi-w-speech { background: #17212e; border-radius: 10px; padding: 10px; border: 1px solid #223042; margin-bottom: 10px; }
    .techi-w-footer { padding: 10px; border-top: 1px solid #223042; display: flex; gap: 6px; }
    .techi-w-input {
      flex: 1; background: #17212e; border: 1px solid #223042; color: #fff;
      border-radius: 20px; padding: 6px 12px; font-size: 12px; outline: none;
    }
    .techi-w-btn {
      background: #00e5a0; color: #052018; border: none; border-radius: 50%;
      width: 30px; height: 30px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
  `;
  document.head.appendChild(style);

  // Inject HTML Container
  const container = document.createElement('div');
  container.id = 'techi-widget-container';
  container.innerHTML = `
    <div id="techi-widget-panel">
      <div class="techi-w-header">
        <span>🤖 Techi AI Voice Assistant</span>
        <span style="cursor:pointer;" id="techi-w-close">✕</span>
      </div>
      <div class="techi-w-body">
        <div class="techi-w-speech" id="techi-w-speech">Vanakkam! Ask me anything in Tamil, Tanglish or English.</div>
      </div>
      <div class="techi-w-footer">
        <input type="text" class="techi-w-input" id="techi-w-input" placeholder="Ask Techi..." />
        <button class="techi-w-btn" id="techi-w-send">➔</button>
      </div>
    </div>
    <div id="techi-widget-fab">🎙️</div>
  `;
  document.body.appendChild(container);

  // Widget State
  const fab = document.getElementById('techi-widget-fab');
  const panel = document.getElementById('techi-widget-panel');
  const closeBtn = document.getElementById('techi-w-close');
  const speechBox = document.getElementById('techi-w-speech');
  const input = document.getElementById('techi-w-input');
  const sendBtn = document.getElementById('techi-w-send');

  fab.onclick = () => {
    panel.classList.toggle('open');
    toggleVoiceRec();
  };
  closeBtn.onclick = () => panel.classList.remove('open');

  sendBtn.onclick = () => {
    const text = input.value.trim();
    if (text) {
      input.value = '';
      sendToTechi(text);
    }
  };
  input.onkeypress = (e) => {
    if (e.key === 'Enter') sendBtn.click();
  };

  // Web Speech API
  let rec = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new SpeechRec();
    rec.lang = 'en-IN';
    rec.onstart = () => fab.className = 'listening';
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      sendToTechi(text);
    };
    rec.onend = () => fab.className = '';
  }

  function toggleVoiceRec() {
    if (rec) {
      try { rec.start(); } catch(e) { rec.stop(); }
    }
  }

  async function sendToTechi(msg) {
    speechBox.textContent = `Thinking: "${msg}"...`;
    try {
      const res = await fetch(`${backendOrigin}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      const reply = data.speech || "Done bro!";
      speechBox.textContent = reply;
      speakTTS(reply);
    } catch(e) {
      speechBox.textContent = "Error connecting to Techi AI server.";
    }
  }

  function speakTTS(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.onstart = () => fab.className = 'speaking';
    utt.onend = utt.onerror = () => fab.className = '';
    window.speechSynthesis.speak(utt);
  }
})();
