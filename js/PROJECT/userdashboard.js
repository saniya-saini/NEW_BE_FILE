const API_URL = "http://localhost:3000/businfo";

if (typeof userData === 'undefined') {
    var userData = JSON.stringify({
        name: 'User',
        email: 'user@example.com'
    });
}

const StorageManager = {
    async getBusLocation(busId) {
        try {
            console.log(`🔍 Fetching bus location for: ${busId}`);
            console.log(`📡 API URL: ${API_URL}`);

            const response = await fetch(API_URL);

            console.log(`📊 Response status: ${response.status}`);
            console.log(`📊 Response ok: ${response.ok}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch bus locations. Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Raw API Response:', data);
            console.log('📦 Response type:', Array.isArray(data) ? 'Array' : typeof data);

            let busLocation = null;
            let busList = [];

            // Handle different API response formats
            if (Array.isArray(data)) {
                // API returns array directly: [{busId, lat, lng, ...}, ...]
                console.log(`🔎 API returned array with ${data.length} buses`);
                busList = data;
                busLocation = data.find(bus => bus.busId === busId);
            }
            else if (data.businfo && Array.isArray(data.businfo)) {
                // API returns object with businfo array: {businfo: [{...}]}
                console.log(`🔎 API returned businfo array with ${data.businfo.length} buses`);
                busList = data.businfo;
                busLocation = data.businfo.find(bus => bus.busId === busId);
            }
            else if (data[busId]) {
                // API returns object with bus IDs as keys: {BUS001: {...}}
                busLocation = { busId: busId, ...data[busId] };
                busList = Object.keys(data).map(id => ({ busId: id, ...data[id] }));
            }
            else {
                console.error('❌ Unexpected API response structure:', data);
            }

            if (busLocation) {
                console.log('✅ Bus location found:', busLocation);
                return busLocation;
            } else {
                console.warn(`⚠ Bus ${busId} not found in API response`);
                console.warn('Available buses:', busList.map(b => b.busId).join(', ') || 'None');
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting location from API:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            return null;
        }
    }
};

let googleMap = null;
let directionsService = null;
let directionsRenderer = null;
let distanceMatrixService = null;
let busMarker = null;
let userMarker = null;
let userLocation = null;
let currentBusId = null;
let updateInterval = null;

const GOOGLE_MAPS_API_KEY = 'AIzaSyDribjKCY1krrSTb1B4NmTo9LO-hUeJR7A';

function initMap() {
    console.log('🗺 Initializing Google Maps...');

    googleMap = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: googleMap,
        suppressMarkers: false,
        polylineOptions: {
            strokeColor: '#667eea',
            strokeWeight: 6,
            strokeOpacity: 0.8
        }
    });

    distanceMatrixService = new google.maps.DistanceMatrixService();

    console.log('✅ Google Maps initialized');
}

function getUserLocation() {
    document.getElementById('userLocationStatus').innerHTML = '📍 Setting default location...';

    // Manually set your current location
    const userLocation = {
        lat: 30.483997,
        lng: 76.593948
    };
    console.log('📍 User location (manual):', userLocation);

    // Remove existing marker if any
    if (userMarker) {
        userMarker.setMap(null);
    }

    // Create new marker for user's location
    userMarker = new google.maps.Marker({
        position: userLocation,
        map: googleMap,
        title: 'Your Location',
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 12
        }
    });

    // Info window for user marker
    const userInfoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 10px; font-family: Arial;">
              <h3 style="margin: 0 0 8px 0; color: #2d3748;">📍 Your Location</h3>
              <p style="margin: 5px 0; font-size: 13px;">${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}</p>
            </div>
        `
    });

    userMarker.addListener('click', () => {
        userInfoWindow.open(googleMap, userMarker);
    });

    // Center and zoom map on this location
    googleMap.setCenter(userLocation);
    googleMap.setZoom(12);

    // Update location status text
    document.getElementById('userLocationStatus').innerHTML =
        `✅ Your location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
}


async function trackBus() {
    const busIdInput = document.getElementById('busIdInput').value.trim();

    if (!busIdInput) {
        alert('Please enter a bus number');
        return;
    }

    currentBusId = busIdInput;
    document.getElementById('trackBtn').disabled = true;
    document.getElementById('trackBtn').textContent = '🔄 Tracking...';
    document.getElementById('status').innerHTML = '<div class="pulse">🔄 Fetching bus location from API...</div>';

    try {
        const busLocation = await StorageManager.getBusLocation(currentBusId);

        if (!busLocation) {
            document.getElementById('status').innerHTML =
                `❌ <strong>Bus "${currentBusId}" not found!</strong><br>
                <small>Please check:</small><br>
                <small>1. Is your API server running at ${API_URL}?</small><br>
                <small>2. Is the bus ID correct?</small><br>
                <small>3. Check console for detailed error logs</small>`;
            document.getElementById('trackBtn').disabled = false;
            document.getElementById('trackBtn').textContent = '🔍 Track Bus';
            document.getElementById('busInfo').innerHTML = '';
            document.getElementById('routeInfo').innerHTML = '';
            return;
        }

        displayBusInfo(busLocation);
        showBusOnMap(busLocation);

        if (userLocation) {
            calculateRoute(busLocation, userLocation);
            calculateDistanceMatrix(busLocation, userLocation);
        } else {
            document.getElementById('routeInfo').innerHTML =
                '<div style="padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404; border-left: 4px solid #ffc107;">⚠ <strong>Enable location permission</strong> to see route and ETA</div>';
        }

        startAutoRefresh();

    } catch (error) {
        console.error('❌ Error tracking bus:', error);
        document.getElementById('status').innerHTML =
            `❌ <strong>Error tracking bus.</strong><br>
            <small>Error: ${error.message}</small><br>
            <small>Check console for details</small>`;
    }

    document.getElementById('trackBtn').disabled = false;
    document.getElementById('trackBtn').textContent = '🔍 Track Bus';
}

async function displayBusInfo(busLocation) {
    let timeText = 'Just now';

    if (busLocation.timestamp) {
        const timeSinceUpdate = Math.floor((Date.now() - busLocation.timestamp) / 1000);
        if (timeSinceUpdate < 60) {
            timeText = `${timeSinceUpdate} seconds ago`;
        } else {
            timeText = `${Math.floor(timeSinceUpdate / 60)} minutes ago`;
        }
    }

    const speed = busLocation.speed || 0;

    // Get location name using reverse geocoding
    let locationName = 'Loading location...';
    try {
        const geocoder = new google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
            geocoder.geocode(
                { location: { lat: busLocation.lat, lng: busLocation.lng } },
                (results, status) => {
                    if (status === 'OK' && results[0]) {
                        resolve(results[0]);
                    } else {
                        reject(status);
                    }
                }
            );
        });

        // Extract district/city/state from address components
        const addressComponents = result.address_components;
        let district = '';
        let city = '';
        let state = '';

        for (let component of addressComponents) {
            if (component.types.includes('administrative_area_level_3')) {
                district = component.long_name;
            }
            if (component.types.includes('locality')) {
                city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
                state = component.short_name;
            }
        }

        locationName = district || city || 'Unknown';
        if (state) {
            locationName += `, ${state}`;
        }

        console.log('📍 Location resolved:', locationName);
    } catch (error) {
        console.error('❌ Geocoding failed:', error);
        locationName = 'Location unavailable';
    }

    const busInfoHtml = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
          <h3 style="margin-bottom: 15px; font-size: 20px; display: flex; align-items: center; gap: 10px;">
            🚌 Bus ${currentBusId}
          </h3>
          <div style="display: grid; gap: 12px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <strong>Location:</strong> 
              <span style="text-align: right; max-width: 60%;">${locationName}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <strong>Latitude:</strong> 
              <span>${busLocation.lat.toFixed(6)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <strong>Longitude:</strong> 
              <span>${busLocation.lng.toFixed(6)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <strong>Speed:</strong> 
              <span style="font-size: 18px; font-weight: bold;">${speed} km/h</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
              <strong>Last Update:</strong> 
              <span style="font-size: 12px; opacity: 0.9;">${timeText}</span>
            </div>
          </div>
        </div>
    `;
    document.getElementById('busInfo').innerHTML = busInfoHtml;
}

function showBusOnMap(busLocation) {
    if (busMarker) {
        busMarker.setMap(null);
    }

    const busIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="23" fill="#667eea" stroke="white" stroke-width="3"/>
            <text x="25" y="35" font-size="30" text-anchor="middle" fill="white">🚌</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 25)
    };

    const speed = busLocation.speed || 0;

    busMarker = new google.maps.Marker({
        position: { lat: busLocation.lat, lng: busLocation.lng },
        map: googleMap,
        title: `Bus ${currentBusId}`,
        animation: google.maps.Animation.DROP,
        icon: busIcon
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: Arial; min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px;">🚌 Bus ${currentBusId}</h3>
            <div style="display: grid; gap: 8px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between;">
                <strong>Speed:</strong> 
                <span style="color: #667eea; font-weight: bold;">${speed} km/h</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <strong>Status:</strong> 
                <span style="color: ${speed > 0 ? '#48bb78' : '#e53e3e'}; font-weight: bold;">
                  ${speed > 0 ? 'Moving' : 'Stopped'}
                </span>
              </div>
              <div style="padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <strong>Location:</strong><br>
                <span style="font-size: 11px; color: #666;">${busLocation.lat.toFixed(6)}, ${busLocation.lng.toFixed(6)}</span>
              </div>
              ${busLocation.timestamp ? `<div style="font-size: 11px; color: #999;">
                Last updated: ${new Date(busLocation.timestamp).toLocaleTimeString()}
              </div>` : ''}
            </div>
          </div>
        `
    });

    busMarker.addListener('click', () => {
        infoWindow.open(googleMap, busMarker);
    });

    if (userLocation) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: busLocation.lat, lng: busLocation.lng });
        bounds.extend(userLocation);
        googleMap.fitBounds(bounds);

        setTimeout(() => {
            googleMap.setZoom(googleMap.getZoom() - 1);
        }, 100);
    } else {
        googleMap.setCenter({ lat: busLocation.lat, lng: busLocation.lng });
        googleMap.setZoom(15);
    }
}

function calculateRoute(busLocation, userLoc) {
    const request = {
        origin: { lat: busLocation.lat, lng: busLocation.lng },
        destination: { lat: userLoc.lat, lng: userLoc.lng },
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);

            const route = result.routes[0].legs[0];
            const distance = route.distance.text;
            const duration = route.duration.text;
            const durationValue = route.duration.value;

            const speed = busLocation.speed || 0;

            let adjustedETA = duration;
            if (speed > 0) {
                const distanceKm = route.distance.value / 1000;
                const estimatedTimeHours = distanceKm / speed;
                const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);

                if (estimatedTimeMinutes < 60) {
                    adjustedETA = `${estimatedTimeMinutes} mins`;
                } else {
                    const hours = Math.floor(estimatedTimeMinutes / 60);
                    const mins = estimatedTimeMinutes % 60;
                    adjustedETA = `${hours} hr ${mins} mins`;
                }
            }

            const routeInfoHtml = `
                <div style="display: grid; gap: 15px;">
                  <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                      📏 Distance to Bus
                    </div>
                    <div style="font-size: 32px; font-weight: bold;">${distance}</div>
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                      ⏱ Estimated Time of Arrival
                    </div>
                    <div style="font-size: 32px; font-weight: bold;">${adjustedETA}</div>
                    <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">Based on current speed</div>
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(237, 137, 54, 0.3);">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                      🚀 Current Bus Speed
                    </div>
                    <div style="font-size: 32px; font-weight: bold;">${speed} km/h</div>
                    <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">
                      Status: ${speed > 0 ? '🟢 Moving' : '🔴 Stopped'}
                    </div>
                  </div>
                </div>
            `;
            document.getElementById('routeInfo').innerHTML = routeInfoHtml;

            console.log('✅ Route calculated:', {
                distance,
                duration: adjustedETA,
                speed: speed,
                distanceValue: route.distance.value,
                durationValue: durationValue
            });
        } else {
            console.error('❌ Directions request failed:', status);
            document.getElementById('routeInfo').innerHTML =
                `<div style="padding: 15px; background: #fed7d7; border-radius: 8px; color: #c53030; border-left: 4px solid #e53e3e;">
                  ❌ <strong>Could not calculate route</strong><br>
                  <small>Error: ${status}</small>
                </div>`;
        }
    });
}

function calculateDistanceMatrix(busLocation, userLoc) {
    const origins = [{ lat: busLocation.lat, lng: busLocation.lng }];
    const destinations = [{ lat: userLoc.lat, lng: userLoc.lng }];

    distanceMatrixService.getDistanceMatrix(
        {
            origins: origins,
            destinations: destinations,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
        },
        (response, status) => {
            if (status === 'OK') {
                const result = response.rows[0].elements[0];
                console.log('📊 Distance Matrix Result:', {
                    distance: result.distance.text,
                    duration: result.duration.text
                });
            } else {
                console.error('❌ Distance Matrix request failed:', status);
            }
        }
    );
}

function startAutoRefresh() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    console.log('🔄 Starting auto-refresh every 30 seconds');
    updateInterval = setInterval(() => {
        if (currentBusId) {
            console.log('🔄 Auto-refreshing bus location...');
            trackBus();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('⏸ Auto-refresh stopped');
        document.getElementById('status').innerHTML = '⏸ Tracking stopped';
    }
}

window.addEventListener('DOMContentLoaded', function () {
    console.log('🚌 User Dashboard Initializing...');

    const user = JSON.parse(userData);
    document.getElementById('userName').textContent = user.name;

    // Test API connection
    console.log('🔌 Testing API connection...');
    fetch(API_URL)
        .then(res => {
            if (res.ok) {
                console.log('✅ API server is reachable');
                return res.json();
            } else {
                console.error(`❌ API returned status ${res.status}`);
            }
        })
        .then(data => {
            if (data) {
                console.log('📦 API Response:', data);
            }
        })
        .catch(err => {
            console.error('❌ Cannot connect to API server:', err);
            console.error('Make sure your server is running at:', API_URL);
        });


    setTimeout(getUserLocation, 1000);

    console.log('✅ User dashboard ready for:', user.name);
});

document.getElementById('trackBtn').addEventListener('click', trackBus);

const stopBtn = document.getElementById('stopBtn');
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        stopAutoRefresh();
    });
}

document.getElementById('busIdInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        trackBus();
    }
});


console.log('✅ User Dashboard Script Loaded - Ready to connect to API');

// ===================== DRIVER LOCATION SHARING (NO NODE, JSON + JS ONLY) =====================
// This module lets a driver share live location. It upserts into API_URL (/businfo)
// using only fetch and DOM. It also mirrors into localStorage appData.locations.

const DriverShare = (() => {
    let geoWatchId = null;
    let lastSentAt = 0;
    let currentBusIdForDriver = null;

    async function upsertBusLocation(busId, payload) {
        try {
            // Find existing record by busId
            const findRes = await fetch(`${API_URL}?busId=${encodeURIComponent(busId)}`);
            if (!findRes.ok) throw new Error(`Lookup failed: ${findRes.status}`);
            const arr = await findRes.json();

            if (Array.isArray(arr) && arr.length > 0 && arr[0].id != null) {
                const id = arr[0].id;
                const patchRes = await fetch(`${API_URL}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!patchRes.ok) throw new Error(`PATCH failed: ${patchRes.status}`);
            } else {
                const postRes = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ busId, ...payload })
                });
                if (!postRes.ok) throw new Error(`POST failed: ${postRes.status}`);
            }

            mirrorToLocalStorage(busId, payload);
            return true;
        } catch (e) {
            console.error('❌ Failed to upsert bus location:', e);
            return false;
        }
    }

    function mirrorToLocalStorage(busId, payload) {
        try {
            const raw = localStorage.getItem('appData');
            if (!raw) return;
            const data = JSON.parse(raw);
            data.locations = Array.isArray(data.locations) ? data.locations : [];
            const idx = data.locations.findIndex(l => l.busId === busId);
            const merged = {
                busId,
                lat: payload.lat,
                lng: payload.lng,
                speed: (`payload.speed != null ? ${payload.speed} km/h : '0 km/h'`),
                timestamp: payload.timestamp,
                status: 'online'
            };
            if (idx >= 0) data.locations[idx] = { ...data.locations[idx], ...merged };
            else data.locations.push(merged);
            localStorage.setItem('appData', JSON.stringify(data));
        } catch { }
    }

    function start(busId) {
        if (!busId) {
            alert('Enter a bus ID to start sharing');
            return;
        }
        if (!navigator.geolocation) {
            alert('Geolocation not supported on this browser');
            return;
        }
        currentBusIdForDriver = busId;
        // Send an immediate fix and then watch
        navigator.geolocation.getCurrentPosition(async pos => {
            const payload = buildPayload(pos);
            await upsertBusLocation(busId, payload);
        }, () => { }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });

        geoWatchId = navigator.geolocation.watchPosition(async pos => {
            // Throttle to once every 10 seconds
            const now = Date.now();
            if (now - lastSentAt < 10000) return;
            lastSentAt = now;
            const payload = buildPayload(pos);
            await upsertBusLocation(busId, payload);
        }, err => {
            console.error('❌ Driver geolocation error:', err);
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });

        const shareBtn = document.getElementById('driverShareBtn');
        if (shareBtn) shareBtn.textContent = '🛑 Stop Sharing';
        console.log(`🚀 Started sharing for ${busId}`);
    }

    function stop() {
        if (geoWatchId != null) {
            navigator.geolocation.clearWatch(geoWatchId);
            geoWatchId = null;
        }
        const shareBtn = document.getElementById('driverShareBtn');
        if (shareBtn) shareBtn.textContent = '📡 Start Sharing';
        console.log('⏸ Stopped sharing');
    }

    function buildPayload(position) {
        const coords = position.coords;
        const speedKmh = coords.speed != null && !Number.isNaN(coords.speed)
            ? Math.max(0, Math.round((coords.speed * 3.6))) // m/s -> km/h
            : 0;
        return {
            lat: coords.latitude,
            lng: coords.longitude,
            speed: speedKmh,
            timestamp: Date.now()
        };
    }

    return { start, stop };
})();

// Optional DOM wiring (only if elements exist on page using this script)
window.addEventListener('DOMContentLoaded', function () {
    const shareBtn = document.getElementById('driverShareBtn');
    const busInput = document.getElementById('driverBusIdInput');
    if (shareBtn && busInput) {
        shareBtn.addEventListener('click', () => {
            if (shareBtn.textContent.includes('Start')) {
                DriverShare.start(busInput.value.trim());
            } else {
                DriverShare.stop();
            }
        });
    }
});

// Expose for manual usage from HTML: DriverShare.start('BUS_101'), DriverShare.stop()
window.DriverShare = DriverShare;
window.initMap = initMap;