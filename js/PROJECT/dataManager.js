class DataManager {
    constructor() {
      this.storageKey = 'trackbus_database';
      this.data = {
        locations: {},      
        drivers: {},        
        users: {},          
        lastUpdate: null
      };
      this.listeners = [];
      this.updateCallbacks = new Map();
    }
  

    async initialize() {
      console.log('📦 Initializing DataManager...');
      this.loadFromLocalStorage();
      this.setupStorageListener();
      this.setupPeriodicSync();
      console.log('✅ DataManager ready');
      return Promise.resolve();
    }
  
    loadFromLocalStorage() {
      try {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
          this.data = JSON.parse(savedData);
          console.log('📥 Data loaded from localStorage:', Object.keys(this.data.locations).length, 'locations');
        } else {
          console.log('📭 No saved data found, initializing empty database');
          this.saveToLocalStorage();
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        this.data = { locations: {}, drivers: {}, users: {}, lastUpdate: null };
      }
    }
  
    saveToLocalStorage() {
      try {
        this.data.lastUpdate = new Date().toISOString();
        const dataString = JSON.stringify(this.data);
        localStorage.setItem(this.storageKey, dataString);
        
        window.dispatchEvent(new CustomEvent('trackbus-data-update', {
          detail: this.data
        }));
        
        console.log('💾 Data saved to localStorage at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('❌ Error saving data:', error);
      }
    }
  
    setupStorageListener() {
    
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey && e.newValue) {
          console.log('🔄 Storage changed in another tab');
          this.loadFromLocalStorage();
          this.notifyListeners();
        }
      });
  
      window.addEventListener('trackbus-data-update', (e) => {
        console.log('🔄 Data updated in same tab');
        this.notifyListeners();
      });
  
      console.log('👂 Storage listeners set up');
    }
  
    setupPeriodicSync() {

      setInterval(() => {
        const oldData = JSON.stringify(this.data.locations);
        this.loadFromLocalStorage();
        const newData = JSON.stringify(this.data.locations);
        
        if (oldData !== newData) {
          console.log('🔄 Data synced from storage');
          this.notifyListeners();
        }
      }, 2000);
    }
  
    
    async updateLocation(busId, lat, lng, speed = 0) {
      if (!busId) {
        console.error('❌ Bus ID is required');
        return false;
      }
  
      if (lat == null || lng == null) {
        console.error('❌ Latitude and longitude are required');
        return false;
      }
  
      const locationData = {
        busId: busId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speed: parseFloat(speed) || 0,
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        status: parseFloat(speed) > 0 ? 'Moving' : 'Stopped'
      };
  
      this.data.locations[busId] = locationData;
      this.saveToLocalStorage();
  
      console.log(`📍 Location updated for ${busId}:`, {
        lat: locationData.lat.toFixed(6),
        lng: locationData.lng.toFixed(6),
        speed: locationData.speed,
        status: locationData.status
      });
  
      return true;
    }
  
    getBusLocation(busId) {
      if (!busId) {
        console.warn('⚠ No bus ID provided');
        return null;
      }
  
      const location = this.data.locations[busId];
      
      if (!location) {
        console.log(`⚠ No location found for bus: ${busId}`);
        return null;
      }

      const ageMs = Date.now() - location.timestamp;
      const isRecent = ageMs < 5 * 60 * 1000;
      
      if (!isRecent) {
        console.warn(`⚠ Location for ${busId} is ${Math.floor(ageMs / 60000)} minutes old`);
      }
  
      return {
        ...location,
        isRecent,
        age: this.getLocationAge(busId)
      };
    }
  
    getAllLocations() {
      return Object.values(this.data.locations);
    }
  
    getLocationAge(busId) {
      const location = this.data.locations[busId];
      if (!location || !location.timestamp) return 'Unknown';
  
      const ageMs = Date.now() - location.timestamp;
      const ageSeconds = Math.floor(ageMs / 1000);
      const ageMinutes = Math.floor(ageSeconds / 60);
      const ageHours = Math.floor(ageMinutes / 60);
  
      if (ageHours > 0) return `${ageHours}h ${ageMinutes % 60}m ago`;
      if (ageMinutes > 0) return `${ageMinutes}m ago`;
      return `${ageSeconds}s ago`;
    }
  
    
    saveDriver(driverId, driverData) {
      this.data.drivers[driverId] = {
        ...driverData,
        lastActive: new Date().toISOString()
      };
      this.saveToLocalStorage();
      console.log(`👨‍✈ Driver ${driverId} saved`);
    }
  
    getDriver(driverId) {
      return this.data.drivers[driverId] || null;
    }

    saveUser(userId, userData) {
      this.data.users[userId] = {
        ...userData,
        lastActive: new Date().toISOString()
      };
      this.saveToLocalStorage();
      console.log(`👤 User ${userId} saved`);
    }
  
    getUser(userId) {
      return this.data.users[userId] || null;
    }
 
    addListener(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
        console.log('👂 Listener added, total:', this.listeners.length);
      }
    }
  
    removeListener(callback) {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
        console.log('👂 Listener removed, total:', this.listeners.length);
      }
    }
  
    notifyListeners() {
      this.listeners.forEach(callback => {
        try {
          callback(this.data);
        } catch (error) {
          console.error('❌ Error in listener callback:', error);
        }
      });
    }
  
  
    clearOldLocations(maxAgeHours = 1) {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleared = 0;
  
      Object.keys(this.data.locations).forEach(busId => {
        if (this.data.locations[busId].timestamp < cutoffTime) {
          delete this.data.locations[busId];
          cleared++;
        }
      });
  
      if (cleared > 0) {
        this.saveToLocalStorage();
        console.log(`🧹 Cleared ${cleared} old locations`);
      }
  
      return cleared;
    }
  
    clearAllData() {
      this.data = {
        locations: {},
        drivers: {},
        users: {},
        lastUpdate: null
      };
      this.saveToLocalStorage();
      console.log('🗑 All data cleared');
    }
  
    getStats() {
      const locationCount = Object.keys(this.data.locations).length;
      const driverCount = Object.keys(this.data.drivers).length;
      const userCount = Object.keys(this.data.users).length;
  
      return {
        locations: locationCount,
        drivers: driverCount,
        users: userCount,
        lastUpdate: this.data.lastUpdate
      };
    }
  
    printDebugInfo() {
      console.log('==================== DATA MANAGER DEBUG ====================');
      console.log('📊 Stats:', this.getStats());
      console.log('📍 Locations:', this.data.locations);
      console.log('👨‍✈ Drivers:', Object.keys(this.data.drivers));
      console.log('👤 Users:', Object.keys(this.data.users));
      console.log('⏰ Last Update:', this.data.lastUpdate);
      console.log('👂 Active Listeners:', this.listeners.length);
      console.log('===========================================================');
    }
  }
  
  
  if (typeof window !== 'undefined') {
    if (!window.dataManager) {
      window.dataManager = new DataManager();
      console.log('🌐 Global dataManager instance created');
    }
  }
  

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
  }
  

  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (window.dataManager) {
        window.dataManager.clearOldLocations(1);
      }
    }, 10 * 60 * 1000);
  }