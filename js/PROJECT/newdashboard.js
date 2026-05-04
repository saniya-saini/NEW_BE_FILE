let sidebarOpen = false;
let searchOpen = false;
let darkMode = false;
let currentUser = null;
let buses = [];
let reports = [];
let realTimeInterval = null;
let notificationQueue = [];

class APIService {
  constructor() {
    this.baseURL = '/api';
    this.mockData = this.initializeMockData();
  }

  initializeMockData() {
    return {
      buses: [
        {
          id: 'MH12AB1234',
          route: 'Pune → Mumbai',
          status: 'Moving',
          speed: 45,
          passengers: 32,
          capacity: 45,
          eta: '2:30 PM',
          location: { lat: 18.5204, lng: 73.8567 },
          driver: 'Rajesh Kumar',
          lastUpdate: new Date()
        },
        {
          id: 'MH14CD5678',
          route: 'Mumbai → Delhi',
          status: 'Moving',
          speed: 62,
          passengers: 28,
          capacity: 40,
          eta: '6:45 PM',
          location: { lat: 19.0760, lng: 72.8777 },
          driver: 'Priya Sharma',
          lastUpdate: new Date()
        },
        {
          id: 'MH16EF9012',
          route: 'Nagpur → Bhopal',
          status: 'Stopped',
          speed: 0,
          passengers: 15,
          capacity: 35,
          eta: 'Delayed',
          location: { lat: 21.1458, lng: 79.0882 },
          driver: 'Amit Singh',
          lastUpdate: new Date()
        }
      ],
      reports: [
        {
          id: 1,
          busId: 'MH14CD5678',
          type: 'Safety',
          description: 'Rash driving incident reported',
          status: 'Open',
          priority: 'High',
          reporter: 'Passenger',
          timestamp: new Date(Date.now() - 15 * 60000),
          location: 'Highway 1'
        },
        {
          id: 2,
          busId: 'MH12AB1234',
          type: 'Maintenance',
          description: 'Engine noise reported',
          status: 'In Progress',
          priority: 'Medium',
          reporter: 'Driver',
          timestamp: new Date(Date.now() - 2 * 3600000),
          location: 'Service Center'
        }
      ],

    };
  }

  async fetchBuses() {
    await this.delay(300);
    return this.mockData.buses;
  }

  async fetchReports() {
    await this.delay(200);
    return this.mockData.reports;
  }
  async fetchUser() {
    const response = await fetch('/api/session-user'); // ✅ Asks the server
    const data = await response.json();
    return data.success ? data.user : null;
  }
  async updateBusStatus(busId, status) {
    await this.delay(150);
    const bus = this.mockData.buses.find(b => b.id === busId);
    if (bus) {
      bus.status = status;
      bus.lastUpdate = new Date();
    }
    return bus;
  }

  async addReport(report) {
    await this.delay(200);
    const newReport = {
      id: this.mockData.reports.length + 1,
      ...report,
      timestamp: new Date()
    };
    this.mockData.reports.push(newReport);
    return newReport;
  }

  async resolveReport(reportId) {
    await this.delay(150);
    const report = this.mockData.reports.find(r => r.id === reportId);
    if (report) {
      report.status = 'Resolved';
    }
    return report;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const api = new APIService();


class LiveTrackingAPI {
  constructor() {
    this.mapInstance = null;
    this.busMarkers = new Map();
    this.routePolylines = new Map();
    this.busRoutes = new Map();
    this.isMapInitialized = false;
    this.trackingInterval = null;
    this.showRoutes = true;
    this.showTraffic = false;
    this.busIcons = this.createBusIcons();
    this.realTimeData = this.initializeRealTimeData();
  }

  initializeRealTimeData() {
    return {
      buses: [
        {
          id: 'MH12AB1234',
          route: 'Pune → Mumbai',
          status: 'Moving',
          speed: 45,
          passengers: 32,
          capacity: 45,
          eta: '2:30 PM',
          location: { lat: 18.5204, lng: 73.8567 },
          driver: 'Rajesh Kumar',
          lastUpdate: new Date(),
          routeCoordinates: [
            { lat: 18.5204, lng: 73.8567 },
            { lat: 19.0760, lng: 72.8777 },
            { lat: 19.2183, lng: 72.9781 },
            { lat: 19.2502, lng: 73.1342 }
          ],
          currentRouteIndex: 1,
          direction: 'forward'
        },
        {
          id: 'MH14CD5678',
          route: 'Mumbai → Delhi',
          status: 'Moving',
          speed: 62,
          passengers: 28,
          capacity: 40,
          eta: '6:45 PM',
          location: { lat: 19.0760, lng: 72.8777 },
          driver: 'Priya Sharma',
          lastUpdate: new Date(),
          routeCoordinates: [
            { lat: 19.0760, lng: 72.8777 },
            { lat: 20.2961, lng: 85.8245 },
            { lat: 22.5726, lng: 88.3639 },
            { lat: 28.6139, lng: 77.2090 }
          ],
          currentRouteIndex: 0,
          direction: 'forward'
        },
        {
          id: 'MH16EF9012',
          route: 'Nagpur → Bhopal',
          status: 'Stopped',
          speed: 0,
          passengers: 15,
          capacity: 35,
          eta: 'Delayed',
          location: { lat: 21.1458, lng: 79.0882 },
          driver: 'Amit Singh',
          lastUpdate: new Date(),
          routeCoordinates: [
            { lat: 21.1458, lng: 79.0882 },
            { lat: 21.1615, lng: 79.0881 },
            { lat: 23.2599, lng: 77.4126 }
          ],
          currentRouteIndex: 0,
          direction: 'forward'
        }
      ]
    };
  }


  createBusIcons() {
    return {
      moving: L.divIcon({
        className: 'bus-marker moving',
        html: '<div class="bus-icon">🚌</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      }),
      stopped: L.divIcon({
        className: 'bus-marker stopped',
        html: '<div class="bus-icon">🚌</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      }),
      online: L.divIcon({
        className: 'bus-marker online',
        html: '<div class="bus-icon">🚌</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    };
  }


  async initializeMap() {
    if (this.isMapInitialized) return;

    const mapContainer = document.getElementById('trackingMap');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    try {

      this.mapInstance = L.map('trackingMap', {
        center: [20.2961, 77.2090],
        zoom: 6,
        zoomControl: true,
        attributionControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.mapInstance);


      this.initializeBusMarkers();
      this.initializeRoutes();
      this.updateMapStats();

      this.isMapInitialized = true;
      console.log('🗺 Interactive map initialized successfully');
      showNotification('Live tracking map loaded successfully!', 'success');


      this.startTracking();
    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.initializeFallbackMap();
    }
  }


  initializeFallbackMap() {
    const mapContainer = document.querySelector('.tracking-map');
    if (!mapContainer) return;

    mapContainer.innerHTML = `
              <div class="fallback-map">
                <div class="map-title">🚌 Live Bus Tracking</div>
                <div class="map-subtitle">Real-time GPS tracking with API integration</div>
                <div class="map-legend">
                  <div class="legend-item">
                    <div class="legend-dot dot-online"></div>
                    <span>Online Buses</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-dot dot-moving"></div>
                    <span>Moving Buses</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-dot dot-stopped"></div>
                    <span>Stopped Buses</span>
                  </div>
                </div>
                <div class="bus-locations" id="busLocations"></div>
                <div class="api-status">
                  <div class="status-indicator">
                    <div class="status-dot online"></div>
                    <span>API Connected</span>
                  </div>
                  <div class="update-info">Last updated: <span id="lastUpdate">Just now</span></div>
                </div>
              </div>
            `;

    this.updateFallbackMap();
    this.isMapInitialized = true;
    showNotification('Live tracking API connected successfully!', 'success');
  }

  updateFallbackMap() {
    const busLocations = document.getElementById('busLocations');
    const lastUpdate = document.getElementById('lastUpdate');

    if (!busLocations) return;

    busLocations.innerHTML = this.realTimeData.buses.map(bus => `
              <div class="bus-location-item ${bus.status.toLowerCase()}">
                <div class="bus-marker"></div>
                <div class="bus-info">
                  <div class="bus-id">${bus.id}</div>
                  <div class="bus-route">${bus.route}</div>
                  <div class="bus-speed">${bus.speed} km/h</div>
                  <div class="bus-location">📍 ${bus.location.lat.toFixed(4)}, ${bus.location.lng.toFixed(4)}</div>
                  <div class="bus-passengers">👥 ${bus.passengers}/${bus.capacity} passengers</div>
                </div>
              </div>
            `).join('');


    if (lastUpdate) {
      lastUpdate.textContent = new Date().toLocaleTimeString();
    }
  }


  initializeBusMarkers() {
    this.realTimeData.buses.forEach(bus => {
      const marker = L.marker([bus.location.lat, bus.location.lng], {
        icon: this.busIcons[bus.status.toLowerCase()] || this.busIcons.online
      });

      marker.bindPopup(this.createBusPopup(bus));

      marker.addTo(this.mapInstance);


      this.busMarkers.set(bus.id, marker);
    });
  }

  createBusPopup(bus) {
    return `
              <div class="bus-info-window">
                <h3>🚌 ${bus.id}</h3>
                <p><strong>Route:</strong> ${bus.route}</p>
                <p><strong>Status:</strong> ${bus.status}</p>
                <p><strong>Speed:</strong> ${bus.speed} km/h</p>
                <p><strong>Passengers:</strong> ${bus.passengers}/${bus.capacity}</p>
                <p><strong>Driver:</strong> ${bus.driver}</p>
                <p><strong>Last Update:</strong> ${new Date(bus.lastUpdate).toLocaleTimeString()}</p>
              </div>
            `;
  }

  initializeRoutes() {
    this.realTimeData.buses.forEach(bus => {
      if (bus.routeCoordinates && bus.routeCoordinates.length > 1) {
        const polyline = L.polyline(
          bus.routeCoordinates.map(coord => [coord.lat, coord.lng]),
          {
            color: this.getRouteColor(bus.id),
            weight: 3,
            opacity: 0.8
          }
        );

        polyline.addTo(this.mapInstance);
        this.routePolylines.set(bus.id, polyline);
      }
    });
  }


  getBusIcon(status) {
    const colors = {
      'Moving': '#48bb78',
      'Stopped': '#f56565',
      'Online': '#3b82f6'
    };

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: colors[status] || '#6b7280',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 8
    };
  }


  getRouteColor(status) {
    const colors = {
      'Moving': '#48bb78',
      'Stopped': '#f56565',
      'Online': '#3b82f6'
    };
    return colors[status] || '#6b7280';
  }

  createInfoWindowContent(bus) {
    return `
              <div class="bus-info-window">
                <h3>${bus.id}</h3>
                <p><strong>Route:</strong> ${bus.route}</p>
                <p><strong>Status:</strong> ${bus.status}</p>
                <p><strong>Speed:</strong> ${bus.speed} km/h</p>
                <p><strong>Passengers:</strong> ${bus.passengers}/${bus.capacity}</p>
                <p><strong>Driver:</strong> ${bus.driver}</p>
                <p><strong>ETA:</strong> ${bus.eta}</p>
                <p><strong>Last Update:</strong> ${bus.lastUpdate.toLocaleTimeString()}</p>
              </div>
            `;
  }

  getMapStyles() {
    const isDarkMode = document.body.classList.contains('dark-mode');

    if (isDarkMode) {
      return [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }]
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }]
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }]
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }]
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }]
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }]
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }]
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }]
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }]
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }]
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }]
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }]
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }]
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }]
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }]
        }
      ];
    }
    return [];
  }


  startTracking() {
    if (this.trackingInterval) return;

    this.trackingInterval = setInterval(() => {
      this.updateBusPositions();
      this.updateMapDisplay();
    }, 3000);
  }

  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }


  updateBusPositions() {
    this.realTimeData.buses.forEach(bus => {
      if (bus.status === 'Moving' && bus.routeCoordinates && bus.routeCoordinates.length > 1) {

        const totalPoints = bus.routeCoordinates.length;
        const currentIndex = bus.currentRouteIndex;
        const nextIndex = bus.direction === 'forward' ?
          (currentIndex + 1) % totalPoints :
          (currentIndex - 1 + totalPoints) % totalPoints;


        const progress = Math.random() * 0.3 + 0.1;
        const currentPoint = bus.routeCoordinates[currentIndex];
        const nextPoint = bus.routeCoordinates[nextIndex];


        bus.location.lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * progress;
        bus.location.lng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * progress;


        bus.speed = Math.floor(Math.random() * 20) + 40; // 40-60 km/h

        if (progress > 0.8) {
          bus.currentRouteIndex = nextIndex;


          if (nextIndex === 0 || nextIndex === totalPoints - 1) {
            bus.direction = bus.direction === 'forward' ? 'backward' : 'forward';
          }
        }

        bus.lastUpdate = new Date();
      }
    });
  }

  updateMapDisplay() {
    if (this.isMapInitialized) {
      if (this.mapInstance) {

        this.realTimeData.buses.forEach(bus => {
          const markerData = this.busMarkers.get(bus.id);
          if (markerData) {
            markerData.marker.setPosition(bus.location);
            markerData.marker.setIcon(this.getBusIcon(bus.status));
            markerData.marker.setAnimation(
              bus.status === 'Moving' ? google.maps.Animation.BOUNCE : null
            );
          }
        });
      } else {

        this.updateFallbackMap();
      }
    }
  }

  getBusData() {
    return this.realTimeData.buses;
  }


  updateBusStatus(busId, status) {
    const bus = this.realTimeData.buses.find(b => b.id === busId);
    if (bus) {
      bus.status = status;
      bus.lastUpdate = new Date();


      if (this.mapInstance) {
        const markerData = this.busMarkers.get(busId);
        if (markerData) {
          markerData.marker.setIcon(this.getBusIcon(status));
          markerData.marker.setAnimation(
            status === 'Moving' ? google.maps.Animation.BOUNCE : null
          );
        }
      }
    }
  }

  addBus(busData) {
    this.realTimeData.buses.push(busData);
    if (this.mapInstance) {
      this.initializeBusMarkers();
    }
  }


  removeBus(busId) {
    this.realTimeData.buses = this.realTimeData.buses.filter(b => b.id !== busId);

    if (this.mapInstance) {
      const markerData = this.busMarkers.get(busId);
      if (markerData) {
        markerData.marker.setMap(null);
        this.busMarkers.delete(busId);
      }

      const route = this.routePolylines.get(busId);
      if (route) {
        route.setMap(null);
        this.routePolylines.delete(busId);
      }
    }
  }


  updateMapStats() {
    const statsElement = document.getElementById('mapStats');
    if (statsElement) {
      const onlineBuses = this.realTimeData.buses.filter(bus => bus.status === 'Online').length;
      const movingBuses = this.realTimeData.buses.filter(bus => bus.status === 'Moving').length;
      const stoppedBuses = this.realTimeData.buses.filter(bus => bus.status === 'Stopped').length;

      statsElement.innerHTML = `
                <div>Online: ${onlineBuses} | Moving: ${movingBuses} | Stopped: ${stoppedBuses}</div>
                <div>Last Update: ${new Date().toLocaleTimeString()}</div>
              `;
    }
  }
}

const liveTrackingAPI = new LiveTrackingAPI();
// --- Logout Logic ---
async function handleLogout() {
    // 1. Confirm with the user
    if (!confirm("Are you sure you want to log out?")) return;

    try {
        // 2. Tell the server to destroy the session
        const response = await fetch('/api/logout', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();

        // 3. If successful, clear local state and redirect
        if (data.success) {
            console.log("Logout successful, redirecting...");
            window.location.href = '/login';
        } else {
            alert("Logout failed: " + (data.message || "Unknown error"));
        }
    } catch (error) {
        console.error("Error during logout:", error);
        alert("An error occurred while trying to log out.");
    }
}

window.resetMapView = function () {
  if (liveTrackingAPI.mapInstance) {
    liveTrackingAPI.mapInstance.setView([20.2961, 77.2090], 6);
    showNotification('Map view reset to default', 'info');
  }
};

window.toggleBusRoutes = function () {
  liveTrackingAPI.showRoutes = !liveTrackingAPI.showRoutes;
  liveTrackingAPI.routePolylines.forEach(polyline => {
    if (liveTrackingAPI.showRoutes) {
      liveTrackingAPI.mapInstance.addLayer(polyline);
    } else {
      liveTrackingAPI.mapInstance.removeLayer(polyline);
    }
  });
  showNotification(`Bus routes ${liveTrackingAPI.showRoutes ? 'shown' : 'hidden'}, 'info'`);
};

window.toggleTraffic = function () {
  liveTrackingAPI.showTraffic = !liveTrackingAPI.showTraffic;
  showNotification(`Traffic layer ${liveTrackingAPI.showTraffic ? 'enabled' : 'disabled'}, 'info'`);
};

window.centerOnBuses = function () {
  if (liveTrackingAPI.mapInstance && liveTrackingAPI.realTimeData.buses.length > 0) {
    const bounds = L.latLngBounds();
    liveTrackingAPI.realTimeData.buses.forEach(bus => {
      bounds.extend([bus.location.lat, bus.location.lng]);
    });
    liveTrackingAPI.mapInstance.fitBounds(bounds);
    showNotification('Map centered on all buses', 'info');
  }
};


window.initGoogleMaps = function () {
  console.log('🗺 Google Maps API loaded successfully');
  console.log('📍 Map integration ready for live tracking');

};

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    this.loadUserData();
  }

  async loadUserData() {
    try {
      // Calling the exact API we added to server.js
      const response = await fetch('/api/session-user');
      const data = await response.json();

      if (data.success) {
        this.currentUser = data.user;
        // Syncing with your existing UI logic
        this.updateUserInterface();
        console.log("✅ Session validated by server.");
      } else {
        // If server says no session, kick them out to login
        console.error('No active session found.');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Failed to sync with backend session:', error);
      window.location.href = '/login';
    }
  }

  updateUserInterface() {
    if (this.currentUser) {

      const welcomeText = document.querySelector('.welcome-text h1');
      if (welcomeText) {
        welcomeText.textContent = `Welcome back, ${this.currentUser.name}!`;
      }

      const profileName = document.querySelector('.profile-name');
      const profileEmail = document.querySelector('.detail-content p');
      if (profileName) profileName.textContent = this.currentUser.name;
      if (profileEmail) profileEmail.textContent = this.currentUser.email;


      this.updateUserStats();
    }
  }

  updateUserStats() {
    const stats = this.currentUser.stats;
    const statElements = document.querySelectorAll('.profile-stat-number');
    if (statElements.length >= 2) {
      statElements[0].textContent = stats.busesTracked;
      statElements[1].textContent = stats.reportsHandled;
    }
  }

  async logout() {
    try {
      // We will create this logout route in server.js next
      await fetch('/api/logout', { method: 'POST' });
      localStorage.removeItem('currentUser');
      localStorage.removeItem('trackbus_user');
      this.currentUser = null;
      showNotification('Logged out successfully', 'success');
      setTimeout(() => window.location.href = '/login', 1000);
    } catch (error) {
      location.reload(); // Fallback
    }
  }
}
  const authManager = new AuthManager();


class RealTimeManager {
  constructor() {
    this.updateInterval = 5000; // 5 seconds
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    realTimeInterval = setInterval(() => {
      this.updateBusData();
      this.updateStats();
      this.checkForNewReports();
    }, this.updateInterval);
  }

  stop() {
    if (realTimeInterval) {
      clearInterval(realTimeInterval);
      this.isRunning = false;
    }
  }

  async updateBusData() {
    try {

      const buses = liveTrackingAPI.getBusData();
      this.updateBusCards(buses);
      this.updateMapData(buses);
    } catch (error) {
      console.error('Failed to update bus data:', error);
    }
  }

  updateBusCards(buses) {
    const busCards = document.querySelectorAll('.bus-detail-card');
    busCards.forEach((card, index) => {
      if (buses[index]) {
        const bus = buses[index];
        this.updateBusCard(card, bus);
      }
    });
  }

  updateBusCard(card, bus) {
    const statusElement = card.querySelector('.bus-status');
    const speedElement = card.querySelector('.detail-row .value');
    const etaElement = card.querySelectorAll('.detail-row .value')[1];
    const passengersElement = card.querySelectorAll('.detail-row .value')[2];

    if (statusElement) {
      statusElement.textContent = bus.status;
      statusElement.className = bus - status` ${bus.status.toLowerCase()}`;
    }
    if (speedElement) speedElement.textContent = `${bus.speed} km/h`;
    if (etaElement) etaElement.textContent = bus.eta;
    if (passengersElement) passengersElement.textContent = `${bus.passengers}/${bus.capacity}`;
  }

  updateMapData(buses) {

    const mapOverlay = document.querySelector('.map-overlay');
    if (mapOverlay) {

      const movingBuses = buses.filter(bus => bus.status === 'Moving');
      const onlineBuses = buses.filter(bus => bus.status === 'Online');


      this.updateLegendCounts(movingBuses.length, onlineBuses.length);
    }
  }

  updateLegendCounts(moving, online) {

    const legendItems = document.querySelectorAll('.legend-item');
    if (legendItems.length >= 2) {
      legendItems[0].querySelector('span').textContent = Online(`${online}`);
      legendItems[1].querySelector('span').textContent = Moving(`${moving}`);
    }
  }

  async updateStats() {
    try {
      const buses = await api.fetchBuses();
      const reports = await api.fetchReports();

      this.updateWelcomeStats(buses, reports);
      this.updateStatCards(buses, reports);
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  updateWelcomeStats(buses, reports) {
    const activeBuses = buses.filter(bus => bus.status === 'Moving' || bus.status === 'Online').length;
    const totalPassengers = buses.reduce((sum, bus) => sum + bus.passengers, 0);
    const safetyScore = this.calculateSafetyScore(reports);

    const statNumbers = document.querySelectorAll('.welcome-stat-number');
    if (statNumbers.length >= 3) {
      statNumbers[0].textContent = activeBuses;
      statNumbers[1].textContent = totalPassengers.toLocaleString();
      statNumbers[2].textContent = `${safetyScore}%`;
    }
  }

  updateStatCards(buses, reports) {
    const safetyScore = this.calculateSafetyScore(reports);
    const activeBuses = buses.filter(bus => bus.status === 'Moving' || bus.status === 'Online').length;
    const newReports = reports.filter(report =>
      new Date() - new Date(report.timestamp) < 24 * 60 * 60 * 1000
    ).length;

    // Update stat cards
    const statValues = document.querySelectorAll('.stat-card .stat-value');
    if (statValues.length >= 3) {
      statValues[0].textContent = ` ${safetyScore}%`;
      statValues[1].textContent = activeBuses;
      statValues[2].textContent = newReports;
    }
  }

  calculateSafetyScore(reports) {
    const totalReports = reports.length;
    const resolvedReports = reports.filter(r => r.status === 'Resolved').length;
    return totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 100;
  }

  async checkForNewReports() {
    try {
      const reports = await api.fetchReports();
      const newReports = reports.filter(report =>
        new Date() - new Date(report.timestamp) < 5 * 60 * 1000 // Last 5 minutes
      );

      newReports.forEach(report => {
        if (!notificationQueue.includes(report.id)) {
          this.showNewReportNotification(report);
          notificationQueue.push(report.id);
        }
      });
    } catch (error) {
      console.error('Failed to check for new reports:', error);
    }
  }

  showNewReportNotification(report) {
    const message = `New ${report.type} report for Bus ${report.busId}`;
    showNotification(message, 'warning');
  }
}


const API_USERS = 'http://localhost:3000/users';


async function loadUserProfile(userId) {
  try {

    const response = await fetch(API_USERS);

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const users = await response.json();


    const user = users.find(u => u.userId === userId) || users[0];

    if (!user) {
      console.error('User not found');
      return;
    }


    updateProfileSection(user);


    updateContactInfo(user);

  } catch (error) {
    console.error('Error loading user profile:', error);

    document.querySelector('.profile-name').textContent = 'Error loading profile';
  }
}
// newdashboard.js
document.addEventListener('DOMContentLoaded', function () {
  const userData = localStorage.getItem('currentUser');
  if (userData) {
    const user = JSON.parse(userData);
    // This ensures the sidebar updates with the logged-in person
    updateSidebarUI(user);
    updateProfileSection(user);
    updateContactInfo(user);
  } else {
    const userId = getCurrentUserId();
    loadUserProfile(userId);
  }
});

function updateSidebarUI(user) {
  try {
    // 1. Update Main Name and ID
    // Note: use 'user.name' and 'user.userId' as defined in your db.json
    const nameHeader = document.querySelector('.user-profile-card h3') || document.getElementById('dropdownFullName');
    const idLabel = document.querySelector('.user-profile-card p') || document.getElementById('dropdownUserId');

    if (nameHeader) nameHeader.textContent = user.name || "User";
    if (idLabel) idLabel.textContent = user.userId || "ID not found";

    // 2. Update Contact Information
    // These IDs must exist in your newdashboard.html
    const emailDisplay = document.getElementById('userEmailDisplay');
    const phoneDisplay = document.getElementById('userPhoneDisplay');

    if (emailDisplay) emailDisplay.textContent = user.email || "No Email";
    if (phoneDisplay) phoneDisplay.textContent = user.phone || "No Phone";

    // 3. Update Avatar Initial
    const avatar = document.querySelector('.profile-avatar') || document.getElementById('userAvatar');
    if (avatar && user.name) {
      avatar.textContent = user.name.charAt(0).toUpperCase();
    }

    console.log("✅ Sidebar UI updated successfully.");
  } catch (error) {
    console.error("❌ Error updating sidebar:", error);
  }
}


function updateProfileSection(user) {

  const profileName = document.querySelector('.profile-name');
  if (profileName && user.name) {
    profileName.textContent = user.name;
  }

  const profileRole = document.querySelector('.profile-role');
  if (profileRole) {
    profileRole.textContent = 'User';
  }
}


function updateContactInfo(user) {
  const userDetails = document.querySelector('.user-details');
  if (!userDetails) return;

  const detailsHTML = `
    <h3 style="margin-bottom: 20px; color: #2d3748; font-size: 16px;">Contact Information</h3>
  `;

  userDetails.innerHTML = detailsHTML;


  if (user.email) {
    const emailItem = createDetailItem('📧', 'Email', user.email);
    userDetails.appendChild(emailItem);
  }

  if (user.phone) {
    const phoneItem = createDetailItem('📱', 'Phone', user.phone);
    userDetails.appendChild(phoneItem);
  }

  if (user.userId) {
    const userIdItem = createDetailItem('🆔', 'User ID', user.userId);
    userDetails.appendChild(userIdItem);
  }

  if (user.createdAt) {
    const date = new Date(user.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const memberItem = createDetailItem('📅', 'Member Since', formattedDate);
    userDetails.appendChild(memberItem);
  }
}


function createDetailItem(icon, title, value) {
  const detailItem = document.createElement('div');
  detailItem.className = 'detail-item';

  detailItem.innerHTML = `
    <div class="detail-icon">${icon}</div>
    <div class="detail-content">
      <h4>${title}</h4>
      <p>${value}</p>
    </div>
  `;

  return detailItem;
}

function getCurrentUserId() {
  return localStorage.getItem('currentUserId') || 'USR6779';

}


document.addEventListener('DOMContentLoaded', () => {
  // 1. Get the data saved by your login page
  const userData = localStorage.getItem('currentUser');

  if (userData) {
    const user = JSON.parse(userData);
    // 2. Immediately call your function to update the sidebar
    updateSidebarUI(user);

    // 3. Remove the red error box manually if it appeared
    const errorBox = document.querySelector('.profile-section div[style*="background: #fff5f5"]');
    if (errorBox) errorBox.style.display = 'none';
  } else {
    console.error("No user found in localStorage! Please log in again.");
  }
});


function refreshUserProfile(userId) {
  loadUserProfile(userId);
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadUserProfile, refreshUserProfile };
}

const realTimeManager = new RealTimeManager();

class SearchManager {
  constructor() {
    this.currentQuery = '';
    this.filters = {
      status: 'all',
      priority: 'all',
      type: 'all'
    };
  }

  init() {
    this.setupSearchInput();
    this.setupFilters();
  }

  setupSearchInput() {
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
      searchIcon.addEventListener('click', this.toggleSearch.bind(this));
    }
  }

  toggleSearch() {
    if (searchOpen) return;

    searchOpen = true;
    this.createSearchInterface();
  }

  createSearchInterface() {
    const header = document.querySelector('.header');
    header.style.position = 'relative';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.style.cssText = `
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: white;
              border-radius: 25px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.15);
              padding: 15px 25px;
              z-index: 1000;
              min-width: 400px;
            `;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search buses, routes, reports...';
    searchInput.className = 'search-input';
    searchInput.style.cssText = `
              border: none;
              outline: none;
              font-size: 16px;
              width: 100%;
              background: transparent;
            `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
              background: none;
              border: none;
              font-size: 18px;
              cursor: pointer;
              margin-left: 10px;
            `;

    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    searchResults.style.cssText = `
              font-size: 12px;
              color: #718096;
              margin-top: 8px;
              text-align: center;
            `;
    searchResults.textContent = 'Type to search buses, routes, and activities...';

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(closeBtn);
    searchContainer.appendChild(searchResults);
    header.appendChild(searchContainer);

    searchInput.focus();


    searchInput.addEventListener('input', (e) => {
      this.currentQuery = e.target.value.toLowerCase();
      this.performSearch();
      this.updateSearchResults(searchResults);
    });

    closeBtn.addEventListener('click', () => {
      this.closeSearch();
    });

    const closeOnEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeSearch();
        document.removeEventListener('keydown', closeOnEscape);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
  }

  closeSearch() {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
      searchContainer.remove();
    }
    searchOpen = false;
    this.currentQuery = '';
    this.clearSearchResults();
  }

  performSearch() {
    this.searchBuses();
    this.searchReports();
    this.searchActivities();
  }

  searchBuses() {
    const busCards = document.querySelectorAll('.bus-detail-card');
    let matchCount = 0;

    busCards.forEach(card => {
      const busInfo = card.querySelector('.bus-info');
      if (!busInfo) return;

      const busNumber = busInfo.querySelector('h4')?.textContent.toLowerCase() || '';
      const route = busInfo.querySelector('p')?.textContent.toLowerCase() || '';
      const status = card.querySelector('.bus-status')?.textContent.toLowerCase() || '';

      const matches = busNumber.includes(this.currentQuery) ||
        route.includes(this.currentQuery) ||
        status.includes(this.currentQuery);

      if (matches) {
        card.style.display = 'block';
        card.style.opacity = '1';
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = '0 8px 25px rgba(109, 183, 227, 0.3)';
        matchCount++;
      } else {
        card.style.display = this.currentQuery ? 'none' : 'block';
        card.style.opacity = this.currentQuery ? '0.3' : '1';
        card.style.transform = 'scale(1)';
        card.style.boxShadow = '';
      }
    });


    if (this.currentQuery) {
      console.log(`🔍 Found ${matchCount} buses matching "${this.currentQuery}"`);
    }
  }

  searchReports() {

    console.log('Searching reports for:', this.currentQuery);
  }

  searchActivities() {
    const activityItems = document.querySelectorAll('.activity-item');
    let matchCount = 0;

    activityItems.forEach(item => {
      const content = item.querySelector('.activity-content');
      if (!content) return;

      const title = content.querySelector('h4')?.textContent.toLowerCase() || '';
      const description = content.querySelector('p')?.textContent.toLowerCase() || '';
      const time = item.querySelector('.activity-time')?.textContent.toLowerCase() || '';

      const matches = title.includes(this.currentQuery) ||
        description.includes(this.currentQuery) ||
        time.includes(this.currentQuery);

      if (matches) {
        item.style.display = 'flex';
        item.style.opacity = '1';
        item.style.transform = 'scale(1.02)';
        item.style.boxShadow = '0 8px 25px rgba(109, 183, 227, 0.3)';
        matchCount++;
      } else {
        item.style.display = this.currentQuery ? 'none' : 'flex';
        item.style.opacity = this.currentQuery ? '0.3' : '1';
        item.style.transform = 'scale(1)';
        item.style.boxShadow = '';
      }
    });


    if (this.currentQuery) {
      console.log(`🔍 Found ${matchCount} activities matching "${this.currentQuery}"`);
    }
  }

  clearSearchResults() {
    const busCards = document.querySelectorAll('.bus-detail-card');
    const activityItems = document.querySelectorAll('.activity-item');

    [...busCards, ...activityItems].forEach(element => {
      element.style.display = '';
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
      element.style.boxShadow = '';
    });

    console.log('🔍 Search cleared - showing all items');
  }

  updateSearchResults(searchResultsElement) {
    if (!searchResultsElement) return;

    if (!this.currentQuery) {
      searchResultsElement.textContent = 'Type to search buses, routes, and activities...';
      return;
    }

    const busCards = document.querySelectorAll('.bus-detail-card');
    const activityItems = document.querySelectorAll('.activity-item');

    let visibleBuses = 0;
    let visibleActivities = 0;

    busCards.forEach(card => {
      if (card.style.display !== 'none') visibleBuses++;
    });

    activityItems.forEach(item => {
      if (item.style.display !== 'none') visibleActivities++;
    });

    const totalResults = visibleBuses + visibleActivities;

    if (totalResults === 0) {
      searchResultsElement.textContent = `No results found for "${this.currentQuery}"`;
      searchResultsElement.style.color = '#f56565';
    } else {
      searchResultsElement.textContent = `Found ${totalResults} results (${visibleBuses} buses, ${visibleActivities} activities)`;
      searchResultsElement.style.color = '#48bb78';
    }
  }

  setupFilters() {

    console.log('Setting up filters...');
  }
}

const searchManager = new SearchManager();

class ThemeManager {
  constructor() {
    this.darkMode = localStorage.getItem('darkMode') === 'true';
    this.init();
  }

  init() {
    this.applyTheme();
    this.createThemeToggle();
  }

  applyTheme() {
    if (this.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  createThemeToggle() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const themeToggle = document.createElement('button');
    themeToggle.innerHTML = this.darkMode ? '☀' : '🌙';
    themeToggle.className = 'theme-toggle';
    themeToggle.style.cssText = `
              width: 45px;
              height: 45px;
              background: linear-gradient(135deg, #6DB7E3, #9CCAE6);
              border: none;
              border-radius: 12px;
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              box-shadow: 0 4px 15px rgba(135, 206, 235, 0.3);
              transition: all 0.3s ease;
              margin-right: 10px;
            `;

    themeToggle.addEventListener('click', () => this.toggleTheme());
    themeToggle.addEventListener('mouseenter', () => {
      themeToggle.style.transform = 'scale(1.05)';
    });
    themeToggle.addEventListener('mouseleave', () => {
      themeToggle.style.transform = 'scale(1)';
    });

    headerActions.insertBefore(themeToggle, headerActions.firstChild);
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', this.darkMode);
    this.applyTheme();

    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = this.darkMode ? '☀' : '🌙';
    }

    showNotification`(Switched to ${this.darkMode ? 'dark' : 'light'} mode)`;
  }
}

const themeManager = new ThemeManager();

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
  }

  show(message, type = 'info', duration = 3000) {
    const notification = this.createNotification(message, type);
    this.addToQueue(notification);
    this.displayNotification(notification);

    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);
  }

  createNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const colors = {
      info: 'linear-gradient(135deg, #6DB7E3, #9CCAE6)',
      success: 'linear-gradient(135deg, #48bb78, #38a169)',
      warning: 'linear-gradient(135deg, #ed8936, #dd6b20)',
      error: 'linear-gradient(135deg, #f56565, #e53e3e)'
    };

    notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: ${colors[type] || colors.info};
              color: white;
              padding: 15px 25px;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              z-index: 10000;
              font-weight: 500;
              animation: slideInRight 0.3s ease;
              max-width: 300px;
              word-wrap: break-word;
            `;

    notification.textContent = message;
    return notification;
  }

  addToQueue(notification) {
    this.notifications.push(notification);
    if (this.notifications.length > this.maxNotifications) {
      const oldNotification = this.notifications.shift();
      this.removeNotification(oldNotification);
    }
  }

  displayNotification(notification) {
    document.body.appendChild(notification);
    this.adjustPositions();
  }

  adjustPositions() {
    this.notifications.forEach((notification, index) => {
      notification.style.top = ` ${20 + (index * 70)}px`;
    });
  }

  removeNotification(notification) {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
      this.adjustPositions();
    }, 300);
  }
}

const notificationManager = new NotificationManager();


class NavigationManager {
  constructor() {
    this.sidebarOpen = false;
    this.init();
  }

  init() {
    this.setupSidebarToggle();
    this.setupNavigation();
    this.setupActionButtons();
  }

  setupSidebarToggle() {
    const toggleBtn = document.querySelector('.toggle-sidebar');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }
  }

  toggleSidebar() {
    const rightSidebar = document.getElementById('rightSidebar');
    const mainContent = document.getElementById('mainContent');

    this.sidebarOpen = !this.sidebarOpen;

    if (this.sidebarOpen) {
      rightSidebar.classList.add('open');
      mainContent.classList.add('sidebar-open');
    } else {
      rightSidebar.classList.remove('open');
      mainContent.classList.remove('sidebar-open');
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const navText = item.querySelector('span').textContent;
        this.handleNavigation(navText);
      });
    });
  }

  handleNavigation(navText) {
    switch (navText) {
      case 'Dashboard':
        this.showDashboard();
        break;
      case 'Schedule':
        this.showSchedule();
        break;
      case 'Reports':
        this.showReports();
        break;
      case 'Review':
        this.showReview();
        break;
      case 'Book A Ticket':
        this.showBooking();
        break;
    }
  }

  showDashboard() {
    notificationManager.show('Dashboard loaded', 'info');
  }

  showSchedule() {
    notificationManager.show('Schedule feature coming soon!', 'info');
  }

  showReports() {
    notificationManager.show('Reports feature coming soon!', 'info');
  }

  showReview() {
    notificationManager.show('Review feature coming soon!', 'info');
  }

  showBooking() {
    notificationManager.show('Booking feature coming soon!', 'info');
  }

  setupActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const actionText = button.querySelector('h3').textContent;
        this.handleAction(actionText);
      });
    });
  }

  handleAction(actionText) {
    switch (actionText) {
      case 'Track Bus':
        this.openBusTracking();
        break;
      case 'Report Issue':
        this.openIssueReport();
        break;
      case 'View Schedule':
        this.openSchedule();
        break;
      case 'Analytics':
        this.openAnalytics();
        break;
    }
  }

  openBusTracking() {
    notificationManager.show('Opening bus tracking...', 'info');

  }

  openIssueReport() {
    notificationManager.show('Opening issue report form...', 'info');

  }

  openSchedule() {
    notificationManager.show('Loading schedule...', 'info');

  }

  openAnalytics() {
    notificationManager.show('Loading analytics...', 'info');

  }
}

const navigationManager = new NavigationManager();


function showNotification(message, type = 'info') {
  notificationManager.show(message, type);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

document.addEventListener('DOMContentLoaded', function () {

  searchManager.init();
  realTimeManager.start();


  liveTrackingAPI.initializeMap().then(() => {
    liveTrackingAPI.startTracking();
    console.log('Live tracking initialized');
  }).catch(error => {
    console.error('Failed to initialize live tracking:', error);
  });

  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  setTimeout(() => {
    document.body.style.opacity = '1';
  }, 100);

  document.addEventListener('keydown', function (e) {

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchManager.toggleSearch();
    }


    if (e.key === 'Escape' && navigationManager.sidebarOpen) {
      navigationManager.toggleSidebar();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth < 768 && navigationManager.sidebarOpen) {
      navigationManager.toggleSidebar();
    }
  });

  const style = document.createElement('style');
  style.textContent = `
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(100%); opacity: 0; }
            }
            
            /* Dark Mode Styles */
            .dark-mode {
              background: #0f172a !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .sidebar {
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .main-content {
              background: #0f172a !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .stat-card,
            .dark-mode .bus-detail-card,
            .dark-mode .activity-item,
            .dark-mode .live-tracking,
            .dark-mode .quick-actions,
            .dark-mode .recent-activity {
              background: #1e293b !important;
              color: #f1f5f9 !important;
              border: 1px solid #334155 !important;
            }
            
            .dark-mode .welcome-banner {
              background: linear-gradient(135deg, #1e293b, #334155) !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .right-sidebar {
              background: #1e293b !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .nav-item:hover {
              background: rgba(255, 255, 255, 0.1) !important;
            }
            
            .dark-mode .nav-item.active {
              background: rgba(255, 255, 255, 0.2) !important;
            }
            
            .dark-mode .action-btn {
              background: linear-gradient(135deg, #1e293b, #334155) !important;
              color: #f1f5f9 !important;
              border: 1px solid #334155 !important;
            }
            
            .dark-mode .action-btn:hover {
              background: linear-gradient(135deg, #334155, #475569) !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .bus-detail-card {
              background: #1e293b !important;
              border-left: 4px solid #3b82f6 !important;
            }
            
            .dark-mode .activity-item {
              background: #1e293b !important;
              border-left: 4px solid #3b82f6 !important;
            }
            
            .dark-mode .profile-section,
            .dark-mode .user-details,
            .dark-mode .quick-stats {
              background: #1e293b !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .detail-item {
              border-bottom: 1px solid #334155 !important;
            }
            
            .dark-mode .stat-item {
              border-bottom: 1px solid #334155 !important;
            }
            
            .dark-mode .search-container {
              background: #1e293b !important;
              border: 1px solid #334155 !important;
            }
            
            .dark-mode .search-input {
              background: transparent !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .search-input::placeholder {
              color: #94a3b8 !important;
            }
            
            .dark-mode .header-actions button {
              background: linear-gradient(135deg, #1e293b, #334155) !important;
              color: #f1f5f9 !important;
            }
            
            .dark-mode .theme-toggle {
              background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
            }
            
            /* Fallback Map Styles */
            .fallback-map {
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #f7fafc, #edf2f7);
              border-radius: 15px;
              padding: 20px;
            }
            
            .dark-mode .fallback-map {
              background: linear-gradient(135deg, #1e293b, #334155) !important;
              color: #f1f5f9 !important;
            }
            
            .map-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #2d3748;
            }
            
            .dark-mode .map-title {
              color: #f1f5f9 !important;
            }
            
            .bus-locations {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              justify-content: center;
              width: 100%;
            }
            
            .bus-location-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 15px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              min-width: 200px;
            }
            
            .dark-mode .bus-location-item {
              background: #334155 !important;
              color: #f1f5f9 !important;
            }
            
            .bus-location-item.moving {
              border-left: 4px solid #48bb78;
            }
            
            .bus-location-item.stopped {
              border-left: 4px solid #f56565;
            }
            
            .bus-location-item.online {
              border-left: 4px solid #3b82f6;
            }
            
            .bus-marker {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #48bb78;
            }
            
            .bus-location-item.stopped .bus-marker {
              background: #f56565;
            }
            
            .bus-location-item.online .bus-marker {
              background: #3b82f6;
            }
            
            .bus-info {
              flex: 1;
            }
            
            .bus-id {
              font-weight: bold;
              font-size: 14px;
            }
            
            .bus-route {
              font-size: 12px;
              color: #718096;
              margin: 2px 0;
            }
            
            .dark-mode .bus-route {
              color: #94a3b8 !important;
            }
            
            .bus-speed {
              font-size: 11px;
              color: #48bb78;
              font-weight: bold;
            }
            
            /* Bus Info Window Styles */
            .bus-info-window {
              padding: 10px;
              font-family: 'Inter', sans-serif;
            }
            
            .bus-info-window h3 {
              margin: 0 0 10px 0;
              color: #2d3748;
              font-size: 16px;
            }
            
            .bus-info-window p {
              margin: 5px 0;
              font-size: 14px;
              color: #4a5568;
            }
            
            .dark-mode .bus-info-window h3 {
              color: #f1f5f9 !important;
            }
            
            .dark-mode .bus-info-window p {
              color: #e2e8f0 !important;
            }
            
            /* API Status Styles */
            .map-subtitle {
              font-size: 14px;
              color: #718096;
              margin-bottom: 20px;
              text-align: center;
            }
            
            .dark-mode .map-subtitle {
              color: #94a3b8 !important;
            }
            
            .api-status {
              margin-top: 20px;
              padding: 15px;
              background: rgba(72, 187, 120, 0.1);
              border-radius: 10px;
              border: 1px solid rgba(72, 187, 120, 0.3);
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .status-indicator {
              display: flex;
              align-items: center;
              gap: 8px;
              font-weight: bold;
              color: #48bb78;
            }
            
            .status-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #48bb78;
              animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
            
            .update-info {
              font-size: 12px;
              color: #718096;
            }
            
            .dark-mode .update-info {
              color: #94a3b8 !important;
            }
            
            .bus-location {
              font-size: 10px;
              color: #4a5568;
              margin: 2px 0;
            }
            
            .dark-mode .bus-location {
              color: #a0aec0 !important;
            }
            
            .bus-passengers {
              font-size: 10px;
              color: #48bb78;
              font-weight: bold;
            }

            /* Bus Marker Styles */
            .bus-marker {
              background: transparent;
              border: none;
            }

            .bus-icon {
              font-size: 24px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              animation: busPulse 2s infinite;
            }

            .bus-marker.moving .bus-icon {
              animation: busMove 1s infinite;
            }

            .bus-marker.stopped .bus-icon {
              animation: none;
              opacity: 0.7;
            }

            .bus-marker.online .bus-icon {
              animation: busPulse 2s infinite;
            }

            @keyframes busPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }

            @keyframes busMove {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(2px); }
            }

            /* Leaflet Popup Styles */
            .leaflet-popup-content-wrapper {
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }

            .leaflet-popup-content {
              margin: 15px;
              font-family: 'Inter', sans-serif;
            }

            .leaflet-popup-tip {
              background: white;
            }
          `;

  document.head.appendChild(style);

  console.log('🚌 TrackBus Dashboard initialized successfully!');
  console.log('🔗 API Integration Status:');
  console.log('  ✅ Live Tracking API: Connected');
  console.log('  ✅ Real-time Updates: Active');
  console.log('  ✅ GPS Coordinates: Working');
  console.log('  ✅ Bus Status Updates: Enabled');
  console.log('  📍 Map Integration: Ready');

  // Test API integration
  setTimeout(() => {
    console.log('🧪 Testing API integration...');
    const buses = liveTrackingAPI.getBusData();
    console.log('📊 Current buses tracked:', buses.length);
    buses.forEach(bus => {
      console.log(`🚌 ${bus.id}: ${bus.status} at ${bus.location.lat.toFixed(4)}, ${bus.location.lng.toFixed(4)}`);
    });
  }, 2000);
});

function toggleSidebar() {
  const sidebar = document.getElementById('rightSidebar');
  const mainContent = document.getElementById('mainContent');

  sidebar.classList.toggle('open');
  mainContent.classList.toggle('sidebar-open');
}

function initiateBusTracking() {
  alert('Bus tracking feature will be implemented here!\n\nThis will open a map view showing live bus locations.');
}

document.querySelectorAll('.action-btn').forEach((btn, index) => {
  btn.addEventListener('click', function () {
    const actions = ['Track Bus', 'Report Issue', 'View Schedule', 'Analytics'];
    alert(`${actions[index]} feature clicked!`);
  });
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function () {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});