class NavAgent {
  constructor() {
    this.currentPosition = null; // { lat, lng }
    this.activeRoute = null;
    this.currentStepIndex = 0;
    this.watchId = null;
    this.destinationName = null;
    this.isNavigating = false;

    this.mapCard = null;
    this.mapIframe = null;

    this.initLocation();
    this.initUI();
  }

  initUI() {
    this.mapCard = document.getElementById('map-card');
    this.mapIframe = document.getElementById('map-iframe');
  }

  initLocation() {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.currentPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          this.checkNavigationProgress();
        },
        (err) => {
          console.warn("Geolocation warning/denied:", err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }
  }

  showEmbeddedMap(destination) {
    if (!this.mapCard || !this.mapIframe) {
      this.initUI();
    }
    const target = destination || this.destinationName || "Coimbatore";
    const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(target)}&output=embed`;
    
    if (this.mapIframe) {
      this.mapIframe.src = mapEmbedUrl;
    }
    if (this.mapCard) {
      this.mapCard.classList.remove('hidden');
    }
  }

  hideEmbeddedMap() {
    if (!this.mapCard || !this.mapIframe) {
      this.initUI();
    }
    if (this.mapCard) {
      this.mapCard.classList.add('hidden');
    }
    if (this.mapIframe) {
      this.mapIframe.src = '';
    }
  }

  async startRoute(destination, voiceEngine) {
    if (!destination) return;

    this.destinationName = destination;

    // Show embedded Google Maps route view on screen immediately
    this.showEmbeddedMap(destination);

    // Default starting position fallback if live geolocation is not yet acquired
    let startLat = 11.0168; // Sample default (e.g. Coimbatore area)
    let startLng = 76.9558;

    if (this.currentPosition) {
      startLat = this.currentPosition.lat;
      startLng = this.currentPosition.lng;
    }

    try {
      // 1. Geocode destination using Nominatim proxy
      const geoRes = await fetch(`/api/navigation/geocode?q=${encodeURIComponent(destination)}`);
      const geoData = await geoRes.json();

      if (geoData.error) {
        if (voiceEngine) {
          voiceEngine.speak(geoData.speech || `Could not find location ${destination}`);
        }
        return false;
      }

      const endLat = geoData.lat;
      const endLng = geoData.lon;

      // 2. Fetch directions using OpenRouteService proxy
      const routeRes = await fetch(`/api/navigation/route?startLng=${startLng}&startLat=${startLat}&endLng=${endLng}&endLat=${endLat}`);
      const routeData = await routeRes.json();

      if (routeData.error) {
        if (voiceEngine) {
          voiceEngine.speak(routeData.speech || "Failed to calculate route.");
        }
        return false;
      }

      this.activeRoute = routeData;
      this.currentStepIndex = 0;
      this.isNavigating = true;

      const distKm = (routeData.totalDistance / 1000).toFixed(1);
      const firstStep = routeData.steps[0] ? routeData.steps[0].instruction : "Proceed straight";

      const announcement = `${destination}-ku route Google Maps-la ready. Total distance ${distKm} kilometers. First step: ${firstStep}.`;
      if (voiceEngine) {
        voiceEngine.speak(announcement);
      }
      return true;

    } catch (err) {
      console.error("NavAgent route error:", err);
      if (voiceEngine) {
        voiceEngine.speak("Navigation error occurred while finding route.");
      }
      return false;
    }
  }

  openGoogleMaps(destination, voiceEngine) {
    const target = destination || this.destinationName || "Coimbatore";
    this.startRoute(target, voiceEngine);
  }

  getDistanceSummary(voiceEngine) {
    if (!this.isNavigating || !this.activeRoute) {
      if (voiceEngine) {
        voiceEngine.speak("No active navigation currently running.");
      }
      return;
    }

    const distKm = (this.activeRoute.totalDistance / 1000).toFixed(1);
    const text = `${this.destinationName}-ku innum ${distKm} kilometers dhooram irukku.`;
    if (voiceEngine) {
      voiceEngine.speak(text);
    }
  }

  stopNavigation(voiceEngine) {
    this.isNavigating = false;
    this.activeRoute = null;
    this.currentStepIndex = 0;
    this.destinationName = null;
    this.hideEmbeddedMap();

    if (voiceEngine) {
      voiceEngine.speak("Navigation stopped.");
    }
  }

  checkNavigationProgress() {
    if (!this.isNavigating || !this.activeRoute || !this.activeRoute.steps) return;
    // Turn-by-turn guidance update check as live position changes
  }

  // Placeholder for nearby charging station connectable later via techi.updateData()
  findNearbyChargingStation(voiceEngine) {
    this.startRoute("Electric Vehicle Charging Station", voiceEngine);
  }
}
