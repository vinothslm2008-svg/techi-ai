// Battery Mini-Agent Placeholder
class BatteryAgent {
  constructor() {
    this.level = 85; // percentage
    this.health = "Good";
    this.estimatedRangeKm = 320;
  }

  update(data) {
    if (data.battery !== undefined) this.level = data.battery;
    if (data.range !== undefined) this.estimatedRangeKm = data.range;
  }

  getStatus() {
    return {
      batteryLevel: `${this.level}%`,
      estimatedRange: `${this.estimatedRangeKm} km`,
      health: this.health
    };
  }

  getSpokenStatus() {
    return `Battery level ${this.level} percent irukku. Estimated range ${this.estimatedRangeKm} kilometers.`;
  }
}

// Motor Mini-Agent Placeholder
class MotorAgent {
  constructor() {
    this.temperature = 42; // Celsius
    this.rpm = 2400;
    this.status = "Normal";
  }

  update(data) {
    if (data.motorTemp !== undefined) this.temperature = data.motorTemp;
    if (data.rpm !== undefined) this.rpm = data.rpm;
  }

  getStatus() {
    return {
      motorTemp: `${this.temperature}°C`,
      rpm: this.rpm,
      status: this.status
    };
  }

  getSpokenStatus() {
    return `Motor temperature ${this.temperature} degree Celsius. Performance normal ah irukku.`;
  }
}

// Driver Wellness Mini-Agent Placeholder
class DriverWellnessAgent {
  constructor() {
    this.fatigueLevel = "Low";
    this.mood = "Normal"; // Normal, Tired, Drowsy
    this.heartRate = 72;
  }

  update(data) {
    if (data.mood !== undefined) this.mood = data.mood;
    if (data.fatigueLevel !== undefined) this.fatigueLevel = data.fatigueLevel;
    if (data.heartRate !== undefined) this.heartRate = data.heartRate;
  }

  getStatus() {
    return {
      fatigueLevel: this.fatigueLevel,
      mood: this.mood,
      heartRate: `${this.heartRate} bpm`
    };
  }

  getSpokenStatus() {
    if (this.mood === 'tired' || this.mood === 'drowsy') {
      return "Driver fatigue detected. Take a short tea break or listen to energetic songs!";
    }
    return `Driver condition good. Heart rate ${this.heartRate} beats per minute.`;
  }
}
