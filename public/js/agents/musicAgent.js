class MusicAgent {
  constructor() {
    this.player = null;
    this.queue = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.currentVolume = 100;
    this.isDucked = false;
    this.isReady = false;

    this.initYouTubePlayer();
  }

  initYouTubePlayer() {
    window.onYouTubeIframeAPIReady = () => {
      this.player = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0
        },
        events: {
          onReady: () => {
            this.isReady = true;
            console.log("YouTube Player is Ready");
          },
          onStateChange: (event) => {
            // YT.PlayerState.ENDED === 0
            if (event.data === 0) {
              this.playNextTrack();
            }
          },
          onError: (e) => {
            console.error("YouTube Player Error:", e);
            this.playNextTrack();
          }
        }
      });
    };
  }

  async searchAndPlay(query, voiceEngine) {
    if (!query || query.trim() === '') {
      query = "Tamil trending hit songs";
    }

    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.error) {
        if (voiceEngine && data.speech) {
          voiceEngine.speak(data.speech);
        }
        return false;
      }

      if (!data.items || data.items.length === 0) {
        if (voiceEngine) {
          voiceEngine.speak(`Song not found for query ${query}`);
        }
        return false;
      }

      this.queue = data.items;
      this.currentIndex = 0;
      this.playCurrentTrack();

      const songTitle = this.queue[0].title;
      if (voiceEngine) {
        voiceEngine.speak(`Playing ${songTitle}`);
      }
      return true;

    } catch (err) {
      console.error("MusicAgent search error:", err);
      if (voiceEngine) {
        voiceEngine.speak("Failed to search songs due to a network error.");
      }
      return false;
    }
  }

  playCurrentTrack() {
    if (!this.player || !this.queue[this.currentIndex]) return;

    const videoId = this.queue[this.currentIndex].videoId;
    if (this.player.loadVideoById) {
      this.player.loadVideoById(videoId);
      this.player.setVolume(this.isDucked ? 20 : this.currentVolume);
      this.isPlaying = true;
    }
  }

  playNextTrack() {
    if (this.queue.length === 0) return false;
    if (this.currentIndex + 1 < this.queue.length) {
      this.currentIndex++;
      this.playCurrentTrack();
      return this.queue[this.currentIndex];
    } else {
      // Loop or restart queue
      this.currentIndex = 0;
      this.playCurrentTrack();
      return this.queue[0];
    }
  }

  pause() {
    if (this.player && this.player.pauseVideo) {
      this.player.pauseVideo();
      this.isPlaying = false;
      return true;
    }
    return false;
  }

  resume() {
    if (this.player && this.player.playVideo) {
      this.player.playVideo();
      this.isPlaying = true;
      return true;
    }
    return false;
  }

  stop() {
    if (this.player && this.player.stopVideo) {
      this.player.stopVideo();
      this.isPlaying = false;
      this.queue = [];
      return true;
    }
    return false;
  }

  setVolume(volumePercent) {
    this.currentVolume = Math.max(0, Math.min(100, volumePercent));
    if (this.player && this.player.setVolume && !this.isDucked) {
      this.player.setVolume(this.currentVolume);
    }
  }

  setDucked(duck) {
    this.isDucked = duck;
    if (this.player && this.player.setVolume) {
      if (duck) {
        this.player.setVolume(Math.min(20, Math.floor(this.currentVolume * 0.2)));
      } else {
        this.player.setVolume(this.currentVolume);
      }
    }
  }

  // Placeholder function for mood-based music connectable via techi.updateData({ mood: 'tired' })
  async handleMoodMusic(mood, voiceEngine) {
    let moodQuery = "Tamil hit songs";
    if (mood === 'tired' || mood === 'drowsy') {
      moodQuery = "Tamil energetic high bass folk kuthu songs";
      if (voiceEngine) {
        voiceEngine.speak("Neenga tired-ah irukingala? Ennergetic folk songs podren!");
      }
    } else if (mood === 'relaxed') {
      moodQuery = "Tamil pleasant melody acoustic songs";
    }
    return await this.searchAndPlay(moodQuery, voiceEngine);
  }
}
