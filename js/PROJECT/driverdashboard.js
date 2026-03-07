
const StorageManager = {
    async saveBusLocation(busId, location) {
        try {
            const data = {
                busId,
                lat: location.lat,
                lng: location.lng,
                speed: location.speed || 0,
                timestamp: Date.now(),
                lastUpdate: new Date().toISOString()
            };
            await window.storage.set(`bus_location_${busId}, JSON.stringify(data)`);
            console.log(`✅ Location saved for ${busId}:, data`);
            return true;
        } catch (error) {
            console.error('❌ Error saving location:', error);
            return false;
        }
    },

    async getBusLocation(busId) {
        try {
            const result = await window.storage.get(`bus_location_${busId}`);
            return result ? JSON.parse(result.value) : null;
        } catch (error) {
            console.error('❌ Error getting location:', error);
            return null;
        }
    },

    async saveDriver(driverId, driverData) {
        try {
            await window.storage.set(`driver_${driverId}, JSON.stringify(driverData)`);
            return true;
        } catch (error) {
            console.error('❌ Error saving driver:', error);
            return false;
        }
    },

    async getDriver(driverId) {
        try {
            const result = await window.storage.get(`driver_${driverId}`);
            return result ? JSON.parse(result.value) : null;
        } catch (error) {
            return null;
        }
    }
};

let watchId = null;
let currentDriver = null;
let currentBusId = null;
let updateCount = 0;

window.addEventListener('DOMContentLoaded', async function () {
    console.log('🚌 Driver Dashboard Initializing...');

    const driverData = sessionStorage.getItem('currentDriver');
    if (!driverData) {
        alert('Please login first');
        window.location.href = 'driverlogin.html';
        return;
    }

    currentDriver = JSON.parse(driverData);
    currentBusId = currentDriver.busId;

    document.getElementById('driverName').textContent = currentDriver.name;
    document.getElementById('busId').textContent = `Bus: ${currentBusId}`;

  
    document.getElementById('busNumberInput').value = currentBusId;

    console.log('✅ Driver dashboard ready for:', currentDriver.name, 'Bus:', currentBusId);
});

document.getElementById("start").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    if (!currentBusId) {
        alert("Bus ID not found. Please login again.");
        return;
    }

    document.getElementById("status").innerHTML = '<span class="pulse">🔄 Fetching location...</span>';
    document.getElementById("start").style.display = "none";
    document.getElementById("stop").style.display = "inline-block";
    document.getElementById("statusBadge").className = "status-badge status-active pulse";
    document.getElementById("statusBadge").textContent = "Online";

    updateCount = 0;

   
    watchId = navigator.geolocation.watchPosition(
        async position => {
            const { latitude, longitude, speed } = position.coords;
            const speedKmh = speed && speed >= 0 ? (speed * 3.6).toFixed(1) : 0;

            updateCount++;

            document.getElementById("status").innerHTML =
                `✅ <strong>Sharing Location</strong><br>
        📍 Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}<br>
        <small style="color: #718096;">Updates sent: ${updateCount}</small>`;

            document.getElementById("currentLoc").textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            document.getElementById("speed").textContent = `${speedKmh} km/h`;

            
            const saved = await StorageManager.saveBusLocation(currentBusId, {
                lat: latitude,
                lng: longitude,
                speed: parseFloat(speedKmh)
            });

            if (saved) {
                console.log(`✅ Update #${updateCount} - Location saved for ${currentBusId}`);

                const badge = document.getElementById("statusBadge");
                badge.classList.remove("pulse");
                setTimeout(() => badge.classList.add("pulse"), 100);
            } else {
                console.error('❌ Failed to save location');
            }
        },
        error => {
            console.error('❌ Geolocation error:', error);
            document.getElementById("status").innerHTML =
                `❌ <strong>Error:</strong> ${error.message}<br>
        <small>Please enable location permissions and try again.</small>`;
            document.getElementById("statusBadge").className = "status-badge status-inactive";
            document.getElementById("statusBadge").textContent = "Error";

            
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
                document.getElementById("start").style.display = "inline-block";
                document.getElementById("stop").style.display = "none";
            }
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
});


document.getElementById("stop").addEventListener("click", () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;

        document.getElementById("status").innerHTML =
            "⏹ <strong>Tracking stopped</strong><br><small>Press start to resume sharing your location</small>";
        document.getElementById("start").style.display = "inline-block";
        document.getElementById("stop").style.display = "none";
        document.getElementById("statusBadge").className = "status-badge status-inactive";
        document.getElementById("statusBadge").textContent = "Offline";
        document.getElementById("currentLoc").textContent = "Stopped";
        document.getElementById("speed").textContent = "0 km/h";

        console.log('⏹ Location tracking stopped');
    }
});


setInterval(async () => {
    if (watchId !== null && currentBusId) {
        try {
            const location = await StorageManager.getBusLocation(currentBusId);
            if (location) {
                console.log('📊 Current stored location:', location);
            }
        } catch (error) {
            console.error('Error checking stored location:', error);
        }
    }
}, 10000); 