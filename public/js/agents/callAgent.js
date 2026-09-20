class CallAgent {
  constructor() {
    this.contacts = [];
    this.loadContacts();
  }

  async loadContacts() {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        this.contacts = await res.json();
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  }

  async makeCall(queryName, voiceEngine) {
    await this.loadContacts();

    if (!queryName || queryName.trim() === '') {
      if (voiceEngine) {
        voiceEngine.speak("Yaarukku call pannanum? Contact name sollunga.");
      }
      return false;
    }

    const cleanQuery = queryName.toLowerCase().trim();

    const contact = this.contacts.find(c => {
      if (c.name.toLowerCase() === cleanQuery) return true;
      if (c.aliases && c.aliases.some(alias => alias.toLowerCase().includes(cleanQuery) || cleanQuery.includes(alias.toLowerCase()))) return true;
      return false;
    });

    if (contact) {
      const msg = `${contact.name}-ku call panren.`;
      if (voiceEngine) {
        voiceEngine.speak(msg, () => {
          window.location.href = `tel:${contact.phone}`;
        });
      } else {
        window.location.href = `tel:${contact.phone}`;
      }
      return true;
    } else {
      const notFoundMsg = `${queryName} engaloda contacts-la illa. Yaarukku call pannanum?`;
      if (voiceEngine) {
        voiceEngine.speak(notFoundMsg);
      }
      return false;
    }
  }
}
