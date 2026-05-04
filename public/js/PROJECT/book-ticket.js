// ─── book-ticket.js ───────────────────────────────────────────────────────────
// Connects to backend routes:
//   GET  /book-ticket/cities   → city dropdowns
//   GET  /book-ticket/routes   → search buses
//   GET  /book-ticket/tickets  → user's ticket history (session auth)
//   POST /book-ticket          → book a ticket     (session auth)
//   PATCH /book-ticket/tickets/:id → cancel ticket (session auth)
//   GET  /book-ticket/tracking → live tracking data

const API_BASE_URL = 'http://localhost:3000';

// ─── State ────────────────────────────────────────────────────────────────────
let busData = {
    cities: [],
    routes: [],
    tickets: [],
    tracking: []
};

// ─── DOM References ───────────────────────────────────────────────────────────
const hamburgerIcon = document.querySelector('.hamburger-icon');
const sidebar = document.querySelector('.sidebar');
const bookingForm = document.querySelector('.booking-form');
const departureSelect = document.getElementById('departure');
const destinationSelect = document.getElementById('destination');
const availableBusesContainer = document.querySelector('.bus-list');
const ticketHistoryContainer = document.querySelector('.ticket-history-container');
const trackingIdInput = document.getElementById('tracking-id');
const trackBusBtn = document.getElementById('track-bus-btn');
const busTrackingSection = document.querySelector('.bus-tracking-section');
const availableBusesSection = document.querySelector('.available-buses-section');

// ─── API Helpers ──────────────────────────────────────────────────────────────
async function fetchData(url) {
    try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401) {
                showMessage('Session expired. Please log in again.');
                setTimeout(() => { window.location.href = '/login'; }, 2000);
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch error [${url}]:`, error);
        return null;
    }
}

async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            if (response.status === 401) {
                showMessage('Session expired. Please log in again.');
                setTimeout(() => { window.location.href = '/login'; }, 2000);
                return null;
            }
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Post error:', error);
        showMessage(`Failed: ${error.message}`);
        return null;
    }
}

async function patchData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            if (response.status === 401) {
                showMessage('Session expired. Please log in again.');
                setTimeout(() => { window.location.href = '/login'; }, 2000);
                return null;
            }
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Patch error:', error);
        showMessage(`Failed: ${error.message}`);
        return null;
    }
}

// ─── Modal / Alert ────────────────────────────────────────────────────────────
function showMessage(message, isConfirmation = false, onConfirm = null) {
    const modal = document.getElementById('custom-modal');
    const messageContent = document.getElementById('modal-message-content');
    const okButton = modal.querySelector('.modal-content button');

    messageContent.textContent = message;

    if (isConfirmation && onConfirm) {
        okButton.textContent = 'Confirm Cancel';
        okButton.onclick = function () {
            modal.classList.remove('active');
            onConfirm();
        };
        let cancelButton = modal.querySelector('#modal-cancel-button');
        if (!cancelButton) {
            cancelButton = document.createElement('button');
            cancelButton.id = 'modal-cancel-button';
            cancelButton.textContent = 'Keep Ticket';
            cancelButton.style.backgroundColor = '#e53e3e';
            cancelButton.style.marginLeft = '10px';
            cancelButton.onclick = function () { modal.classList.remove('active'); };
            modal.querySelector('.modal-content').appendChild(cancelButton);
        }
        cancelButton.style.display = 'inline-block';
    } else {
        okButton.textContent = 'OK';
        okButton.onclick = function () { modal.classList.remove('active'); };
        const cancelButton = modal.querySelector('#modal-cancel-button');
        if (cancelButton) cancelButton.style.display = 'none';
    }

    modal.classList.add('active');

    if (!isConfirmation) {
        if (modal.timeoutId) clearTimeout(modal.timeoutId);
        modal.timeoutId = setTimeout(() => { modal.classList.remove('active'); }, 4000);
    }
}

// ─── Initialize: Load all data from backend ───────────────────────────────────
async function initializeData() {
    showMessage('Loading data...');

    const [cities, routes, tickets, tracking] = await Promise.all([
        fetchData(`${API_BASE_URL}/book-ticket/cities`),
        fetchData(`${API_BASE_URL}/book-ticket/routes`),
        fetchData(`${API_BASE_URL}/book-ticket/tickets`),
        fetchData(`${API_BASE_URL}/book-ticket/tracking`)
    ]);

    if (cities)   busData.cities   = cities;
    if (routes)   busData.routes   = routes;
    if (tickets)  busData.tickets  = Array.isArray(tickets) ? tickets : (tickets.tickets || []);
    if (tracking) busData.tracking = tracking;

    populateCityDropdowns();
    displayTicketHistory();
}

// ─── Populate city dropdowns ──────────────────────────────────────────────────
function populateCityDropdowns() {
    departureSelect.innerHTML    = '<option value="" disabled selected>Select Departure City</option>';
    destinationSelect.innerHTML  = '<option value="" disabled selected>Select Destination City</option>';

    busData.cities.forEach(city => {
        const cityName = city.name || city;

        const depOption  = document.createElement('option');
        depOption.value  = cityName;
        depOption.textContent = cityName;
        departureSelect.appendChild(depOption);

        const destOption  = document.createElement('option');
        destOption.value  = cityName;
        destOption.textContent = cityName;
        destinationSelect.appendChild(destOption);
    });
}

// ─── Search buses ─────────────────────────────────────────────────────────────
function handleSearchBuses(e) {
    e.preventDefault();

    const departure  = departureSelect.value;
    const destination = destinationSelect.value;
    const travelDate  = document.getElementById('travel-date').value;

    if (!departure || !destination || !travelDate) {
        showMessage('Please fill all required fields (From, To, and Date).');
        return;
    }
    if (departure === destination) {
        showMessage('Departure and destination cannot be the same city.');
        return;
    }

    // Check date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (travelDate < today) {
        showMessage('Please select a valid travel date (today or future).');
        return;
    }

    const route = busData.routes.find(r => r.from === departure && r.to === destination);
    displayAvailableBuses(route, departure, destination, travelDate);
    availableBusesSection.scrollIntoView({ behavior: 'smooth' });
}

// ─── Book a ticket ────────────────────────────────────────────────────────────
async function bookTicket(bus, departure, destination, travelDate) {
    const ticketData = {
        from: departure,
        to: destination,
        date: travelDate,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        busName: `${bus.name} (${bus.type})`,
        seatNumber: 'A' + Math.floor(1 + Math.random() * 20),
        status: 'Upcoming',
        price: `₹${bus.price}`
    };

    showMessage('Booking your ticket...');
    const result = await postData(`${API_BASE_URL}/book-ticket`, ticketData);

    if (result && result.success) {
        const ticketWithId = { ...ticketData, id: result.id || result.ticket?.id };
        busData.tickets.unshift(ticketWithId);
        showMessage(`✅ Ticket booked! PNR: ${ticketWithId.id}`);
        displayTicketHistory();
        setTimeout(() => {
            document.querySelector('.ticket-history-section').scrollIntoView({ behavior: 'smooth' });
        }, 600);
    } else if (result) {
        showMessage(result.message || 'Booking failed. Please try again.');
    }
}

// ─── Cancel a ticket ──────────────────────────────────────────────────────────
async function cancelTicket(ticketId) {
    const result = await patchData(`${API_BASE_URL}/book-ticket/tickets/${ticketId}`, { status: 'Cancelled' });

    if (result && result.success) {
        const ticket = busData.tickets.find(t => t.id === ticketId);
        if (ticket) ticket.status = 'Cancelled';
        showMessage(`Ticket ${ticketId} has been successfully cancelled.`);
        displayTicketHistory();
    }
}

// ─── Display available buses ──────────────────────────────────────────────────
function displayAvailableBuses(route, departure, destination, travelDate) {
    availableBusesContainer.innerHTML = '';

    if (!route || !route.buses || route.buses.length === 0) {
        availableBusesContainer.innerHTML = `
            <div class="no-buses-message">
                <p>No buses found for <strong>${departure} → ${destination}</strong>.</p>
                <p>Try a different route or check back later.</p>
            </div>`;
        return;
    }

    route.buses.forEach(bus => {
        const busCard = document.createElement('div');
        busCard.classList.add('bus-card');

        const amenitiesHtml = (bus.amenities || [])
            .map(a => `<span class="amenity-tag">${a}</span>`)
            .join('');

        busCard.innerHTML = `
            <div class="bus-info">
                <div class="bus-name">${bus.name}</div>
                <div class="bus-type">${bus.type}</div>
                <div class="bus-route">${route.from} → ${route.to}</div>
                <div class="bus-amenities">${amenitiesHtml}</div>
            </div>
            <div class="bus-details">
                <div class="detail-item">
                    <span class="detail-label">Departure</span>
                    <span class="detail-value">${bus.departureTime}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration</span>
                    <span class="detail-value">${bus.duration}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Arrival</span>
                    <span class="detail-value">${bus.arrivalTime}</span>
                </div>
            </div>
            <div class="bus-price-section">
                <div class="price">₹${bus.price}</div>
                <div class="seats-left">${bus.seatsLeft} seats left</div>
                <button class="select-seat-btn" data-bus-id="${bus.busId}">Book Now</button>
            </div>`;

        busCard.querySelector('.select-seat-btn').addEventListener('click', () => {
            bookTicket(bus, departure, destination, travelDate);
        });

        availableBusesContainer.appendChild(busCard);
    });
}

// ─── Display ticket history ───────────────────────────────────────────────────
function displayTicketHistory() {
    if (!busData.tickets || busData.tickets.length === 0) {
        ticketHistoryContainer.innerHTML = '<div class="no-tickets-message">You have no booking history yet.</div>';
        return;
    }

    let html = '';
    busData.tickets.forEach(ticket => {
        const status     = ticket.status || 'Upcoming';
        const statusClass = status.toLowerCase().replace(' ', '-');
        const isCancellable = status === 'Upcoming';

        html += `
            <div class="ticket-card">
                <div class="ticket-header">
                    <div class="ticket-id">${ticket.id}</div>
                    <div class="ticket-status ${statusClass}">${status}</div>
                </div>
                <div class="ticket-route">
                    <div class="ticket-from">${ticket.from}</div>
                    <div class="ticket-arrow">→</div>
                    <div class="ticket-to">${ticket.to}</div>
                </div>
                <div class="ticket-details">
                    <div class="ticket-detail">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${ticket.date}</span>
                    </div>
                    <div class="ticket-detail">
                        <span class="detail-label">Departure:</span>
                        <span class="detail-value">${ticket.departureTime}</span>
                    </div>
                    <div class="ticket-detail">
                        <span class="detail-label">Bus:</span>
                        <span class="detail-value">${ticket.busName}</span>
                    </div>
                    <div class="ticket-detail">
                        <span class="detail-label">Seat:</span>
                        <span class="detail-value">${ticket.seatNumber}</span>
                    </div>
                    <div class="ticket-detail">
                        <span class="detail-label">Price:</span>
                        <span class="detail-value">${ticket.price}</span>
                    </div>
                </div>
                <div class="ticket-actions">
                    <button class="track-ticket-btn" data-ticket-id="${ticket.id}" ${isCancellable ? '' : 'disabled'}>
                        ${isCancellable ? '📍 Track Bus' : 'Tracking N/A'}
                    </button>
                    <button class="download-ticket-btn" data-ticket-id="${ticket.id}">⬇ Download</button>
                    <button class="cancel-ticket-btn" data-ticket-id="${ticket.id}" ${isCancellable ? '' : 'disabled'}>
                        ${isCancellable ? '✕ Cancel' : status}
                    </button>
                </div>
            </div>`;
    });

    ticketHistoryContainer.innerHTML = html;

    // Track bus buttons
    document.querySelectorAll('.track-ticket-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.disabled) return;
            const ticketId = this.getAttribute('data-ticket-id');
            trackingIdInput.value = ticketId;
            handleTrackBus();
            busTrackingSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Cancel buttons
    document.querySelectorAll('.cancel-ticket-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.disabled) {
                showMessage(`Cannot cancel a ${this.textContent.trim()} ticket.`);
                return;
            }
            const ticketId = this.getAttribute('data-ticket-id');
            showMessage(`Are you sure you want to cancel ticket ${ticketId}?`, true, () => {
                cancelTicket(ticketId);
            });
        });
    });

    // Download buttons (simulated)
    document.querySelectorAll('.download-ticket-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const ticketId = this.getAttribute('data-ticket-id');
            const ticket   = busData.tickets.find(t => t.id === ticketId);
            if (ticket) downloadTicket(ticket);
        });
    });
}

// ─── Download ticket as text ──────────────────────────────────────────────────
function downloadTicket(ticket) {
    const content = `
============================
   TRACKBUS - TICKET RECEIPT
============================
PNR / Ticket ID : ${ticket.id}
Status          : ${ticket.status}

Journey Details
--------------
From            : ${ticket.from}
To              : ${ticket.to}
Date            : ${ticket.date}
Departure       : ${ticket.departureTime}
Arrival         : ${ticket.arrivalTime}

Bus             : ${ticket.busName}
Seat            : ${ticket.seatNumber}
Price           : ${ticket.price}

============================
Thank you for using TrackBus!
============================
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Ticket_${ticket.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Track bus ────────────────────────────────────────────────────────────────
function handleTrackBus() {
    const ticketId          = trackingIdInput.value.trim();
    const trackingInfoEl    = document.getElementById('tracking-info');
    const trackingMapEl     = document.getElementById('tracking-map');

    if (!ticketId) {
        showMessage('Please enter a valid ticket/PNR number.');
        return;
    }

    const trackingData = busData.tracking.find(t => t.ticketId === ticketId);

    if (!trackingData) {
        trackingInfoEl.innerHTML = `<div class="tracking-error">No live tracking found for ticket <strong>${ticketId}</strong>.<br>Try: TKT123456, TKT789012, or TKT345678</div>`;
        trackingMapEl.innerHTML  = `<div class="map-placeholder">No live tracking data available for this ticket.</div>`;
        return;
    }

    displayBusTracking(trackingData, trackingInfoEl, trackingMapEl);
}

function displayBusTracking(data, trackingInfo, trackingMap) {
    const isDelayed = data.status.toLowerCase().includes('delay');

    trackingInfo.innerHTML = `
        <div class="tracking-header">
            <h3>Live Tracking Information</h3>
            <div class="tracking-status ${isDelayed ? 'delayed' : 'on-time'}">${data.status}</div>
        </div>
        <div class="tracking-details">
            <div class="tracking-detail">
                <span class="detail-label">Current Speed:</span>
                <span class="detail-value">${data.currentSpeed}</span>
            </div>
            <div class="tracking-detail">
                <span class="detail-label">Distance Remaining:</span>
                <span class="detail-value">${data.distanceRemaining}</span>
            </div>
            <div class="tracking-detail">
                <span class="detail-label">Estimated Arrival:</span>
                <span class="detail-value">${data.estimatedArrival}</span>
            </div>
            <div class="tracking-detail">
                <span class="detail-label">Next Stop:</span>
                <span class="detail-value">${data.nextStop}</span>
            </div>
            <div class="tracking-detail">
                <span class="detail-label">Next Stop Time:</span>
                <span class="detail-value">${data.nextStopTime}</span>
            </div>
            <div class="tracking-detail">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">${data.lastUpdated}</span>
            </div>
        </div>`;

    const progressPercent = calculateProgress(data.distanceRemaining);

    trackingMap.innerHTML = `
        <div class="map-simulation">
            <div class="map-route">
                <div class="map-progress-line">
                    <div class="map-progress" style="width: ${progressPercent}%"></div>
                </div>
                <div class="map-start-point" title="Starting Point"></div>
                <div class="map-current-location" title="Current: ${data.nextStop}" style="left: ${progressPercent}%"></div>
                <div class="map-end-point" title="Destination"></div>
            </div>
            <div class="map-labels">
                <div class="map-label">Start</div>
                <div class="map-label" style="text-align:center">📍 ${data.nextStop}</div>
                <div class="map-label" style="text-align:right">Destination</div>
            </div>
        </div>`;
}

function calculateProgress(distanceRemaining) {
    const distance      = parseInt(distanceRemaining.replace(' km', '')) || 0;
    const totalDistance = 250;
    return Math.max(0, Math.min(95, ((totalDistance - distance) / totalDistance) * 100));
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
async function handleSignOut() {
    try {
        await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    window.location.href = '/login';
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
if (hamburgerIcon) {
    hamburgerIcon.addEventListener('click', () => { sidebar.classList.toggle('active'); });
}

bookingForm.addEventListener('submit', handleSearchBuses);
trackBusBtn.addEventListener('click', handleTrackBus);

const signOutLink = document.querySelector('.sign-out');
if (signOutLink) {
    signOutLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleSignOut();
    });
}

// ─── On DOM Ready ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initializeData();

    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travel-date').setAttribute('min', today);
});