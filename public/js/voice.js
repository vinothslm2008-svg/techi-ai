class TechiVoice {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.onResultCallback = null;
    this.onStateChangeCallback = null;
    this.onSpeechStartCallback = null;
    this.onSpeechEndCallback = null;

    this.lastProcessedTranscript = "";
    this.lastProcessedTime = 0;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'ta-IN'; // Works well for Tamil, Tanglish & Indian English in Chrome

    this.recognition.onstart = () => {
      this.isListening = true;
      if (!this.isSpeaking && this.onStateChangeCallback) {
        this.onStateChangeCallback('listening');
      }
    };

    this.recognition.onresult = (event) => {
      // Ignore any recognized audio if Techi is currently speaking
      if (this.isSpeaking) return;

      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript.trim();

      const now = Date.now();
      // Debounce duplicate or echo transcripts within 3 seconds
      if (transcript && (transcript !== this.lastProcessedTranscript || now - this.lastProcessedTime > 3000)) {
        this.lastProcessedTranscript = transcript;
        this.lastProcessedTime = now;
        if (this.onResultCallback) {
          this.onResultCallback(transcript);
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech Recognition Error:", event.error);
      if (event.error === 'not-allowed') {
        this.speak("Microphone access was denied. Please allow microphone access in your browser settings.");
      } else if (event.error === 'network') {
        this.speak("Internet connection lost. Please check your network.");
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto restart listening hands-free if Techi is not speaking
      if (!this.isSpeaking) {
        setTimeout(() => this.startListening(), 600);
      }
    };
  }

  startListening() {
    if (this.recognition && !this.isListening && !this.isSpeaking) {
      try {
        this.recognition.start();
      } catch (err) {
        // Recognition might already be running
      }
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.abort(); // Immediately stop and discard pending audio
      } catch (err) {}
      this.isListening = false;
    }
  }

  speak(text, onComplete) {
    if (!text || !this.synthesis) return;

    this.isSpeaking = true;
    // Abort recognition immediately so mic is turned off while Techi speaks
    this.stopListening();
    this.synthesis.cancel(); // Clear any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to select an appropriate voice (Tamil/Indian English if available)
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('ta') || v.lang.includes('en-IN')) || voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback('speaking');
      }
      if (this.onSpeechStartCallback) {
        this.onSpeechStartCallback();
      }
    };

    utterance.onend = () => {
      if (this.onSpeechEndCallback) {
        this.onSpeechEndCallback();
      }
      if (onComplete) onComplete();

      // Clear last processed transcript to prevent locking future identical user commands
      setTimeout(() => {
        this.lastProcessedTranscript = "";
        this.isSpeaking = false;
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback('listening');
        }
        this.startListening();
      }, 1000); // 1-second delay so speaker audio tail completely clears
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      this.isSpeaking = false;
      if (this.onSpeechEndCallback) {
        this.onSpeechEndCallback();
      }
      this.startListening();
    };

    this.synthesis.speak(utterance);
  }
}
