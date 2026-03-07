
const API_BASE_URL = 'http://localhost:3000'; 


let busData = {
    cities: [],
    routes: [],
    tickets: [],
    tracking: []
};

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


async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showMessage(`Failed to load ${endpoint}. Please try again later.`);
        return null;
    }
}

async function postData(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error posting to ${endpoint}:`, error);
        showMessage(`Failed to complete the operation. Please try again.`);
        return null;
    }
}

async function updateData(endpoint, id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating ${endpoint}/${id}:`, error);
        showMessage(`Failed to update. Please try again.`);
        return null;
    }
}


async function initializeData() {
    showMessage('Loading data...');
    
    const [cities, routes, tickets, tracking] = await Promise.all([
        fetchData('cities'),
        fetchData('routes'),
        fetchData('tickets'),
        fetchData('tracking')
    ]);
    
    if (cities) busData.cities = cities;
    if (routes) busData.routes = routes;
    if (tickets) busData.tickets = tickets;
    if (tracking) busData.tracking = tracking;
    
    populateCityDropdowns();
    displayTicketHistory();
}

function showMessage(message, isConfirmation = false, onConfirm = null) {
    const modal = document.getElementById('custom-modal');
    const messageContent = document.getElementById('modal-message-content');
    const okButton = modal.querySelector('.modal-content button');
    
    messageContent.textContent = message;
    
    if (isConfirmation && onConfirm) {
        okButton.textContent = 'Confirm Cancel';
        okButton.onclick = function() {
            modal.classList.remove('active');
            onConfirm();
        };
        
        let cancelButton = modal.querySelector('#modal-cancel-button');
        if (!cancelButton) {
            cancelButton = document.createElement('button');
            cancelButton.id = 'modal-cancel-button';
            cancelButton.textContent = 'Cancel';
            cancelButton.style.backgroundColor = '#e53e3e';
            cancelButton.style.marginLeft = '10px';
            cancelButton.onclick = function() { modal.classList.remove('active'); };
            modal.querySelector('.modal-content').appendChild(cancelButton);
        }
        cancelButton.style.display = 'inline-block';
    } else {
        okButton.textContent = 'OK';
        okButton.onclick = function() { modal.classList.remove('active'); };
        const cancelButton = modal.querySelector('#modal-cancel-button');
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }
    }
    
    modal.classList.add('active');
    
    if (!isConfirmation && modal.timeoutId) {
        clearTimeout(modal.timeoutId);
    }
    
    if (!isConfirmation) {
        modal.timeoutId = setTimeout(() => {
            modal.classList.remove('active');
        }, 4000);
    }
}


function populateCityDropdowns() {
    departureSelect.innerHTML = '<option value="" disabled selected>Select Departure City</option>';
    destinationSelect.innerHTML = '<option value="" disabled selected>Select Destination City</option>';

    busData.cities.forEach(city => {
        const cityName = city.name || city;
        
        const depOption = document.createElement('option');
        depOption.value = cityName;
        depOption.textContent = cityName;
        departureSelect.appendChild(depOption);

        const destOption = document.createElement('option');
        destOption.value = cityName;
        destOption.textContent = cityName;
        destinationSelect.appendChild(destOption);
    });
}


function handleSearchBuses(e) {
    e.preventDefault();
    
    const departure = document.getElementById('departure').value;
    const destination = document.getElementById('destination').value;
    const travelDate = document.getElementById('travel-date').value;
    
    if (!departure || !destination || !travelDate) {
        showMessage('Please fill all the required fields (From, To, and Date).');
        return;
    }
    
    if (departure === destination) {
        showMessage('Departure and destination cannot be the same.');
        return;
    }

    const route = busData.routes.find(r => r.from === departure && r.to === destination);
    
    displayAvailableBuses(route, departure, destination);
    availableBusesSection.scrollIntoView({ behavior: 'smooth' });
}

async function bookTicket(bus, departure, destination, travelDate) {
    const newTicket = {
        id: "TKT" + Math.floor(100000 + Math.random() * 900000),
        from: departure,
        to: destination,
        date: travelDate,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        busName: `${bus.name} (${bus.type})`,
        seatNumber: "A" + Math.floor(1 + Math.random() * 20),
        status: "Upcoming",
        price: `₹${bus.price}`
    };

    const result = await postData('book-ticket', newTicket);
    
    if (result) {
        busData.tickets.unshift(result);
        showMessage(`Success! Ticket booked. PNR/Ticket ID: ${result.id}`);
        displayTicketHistory();
        
        setTimeout(() => {
            document.querySelector('.ticket-history-section').scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }
}

async function cancelTicket(ticketId) {
    const ticket = busData.tickets.find(t => t.id === ticketId);
    if (ticket) {
        const result = await updateData('tickets', ticketId, { status: 'Cancelled' });
        
        if (result) {
            ticket.status = 'Cancelled';
            showMessage(`Ticket ${ticketId} has been successfully cancelled.`);
            displayTicketHistory();
        }
    }
}


function displayAvailableBuses(route, departure, destination) {
    availableBusesContainer.innerHTML = '';

    if (!route || !route.buses || route.buses.length === 0) {
        availableBusesContainer.innerHTML = `
            <div class="no-buses-message">
                <p>No buses found for ${departure} → ${destination}.</p>
                <p>Try a different route or check back later.</p>
            </div>
        `;
        return;
    }

    route.buses.forEach(bus => {
        const busCard = document.createElement('div');
        busCard.classList.add('bus-card');
        
        busCard.innerHTML = `
            <div class="bus-info">
                <div class="bus-name">${bus.name}</div>
                <div class="bus-type">${bus.type}</div>
                <div class="bus-route">${route.from} → ${route.to}</div>
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
                <button class="select-seat-btn" data-bus-id="${bus.busId}">Select Seats</button>
            </div>
        `;
        
        const selectBtn = busCard.querySelector('.select-seat-btn');
        selectBtn.addEventListener('click', () => {
            const travelDate = document.getElementById('travel-date').value;
            bookTicket(bus, departure, destination, travelDate);
        });

        availableBusesContainer.appendChild(busCard);
    });
}

function displayTicketHistory() {
    if (busData.tickets.length === 0) {
        ticketHistoryContainer.innerHTML = '<div class="no-tickets-message">You have no booking history yet.</div>';
        return;
    }
    
    let html = '';

    busData.tickets.forEach(ticket => {
        const statusClass = ticket.status.toLowerCase().replace(' ', '-');
        const isCancellable = ticket.status === 'Upcoming';
        const buttonText = isCancellable ? 'Cancel' : ticket.status;

        html += `
            <div class="ticket-card">
                <div class="ticket-header">
                    <div class="ticket-id">${ticket.id}</div>
                    <div class="ticket-status ${statusClass}">${ticket.status}</div>
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
                        ${isCancellable ? 'Track Bus' : 'Tracking N/A'}
                    </button>
                    <button class="download-ticket-btn" data-ticket-id="${ticket.id}">Download</button>
                    <button class="cancel-ticket-btn" data-ticket-id="${ticket.id}" ${isCancellable ? '' : 'disabled'}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    });
    
    ticketHistoryContainer.innerHTML = html;
    
    document.querySelectorAll('.track-ticket-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (this.disabled) return;
            const ticketId = this.getAttribute('data-ticket-id');
            trackingIdInput.value = ticketId;
            handleTrackBus();
            busTrackingSection.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    document.querySelectorAll('.cancel-ticket-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (this.disabled) {
                showMessage('Cannot cancel a ' + this.textContent + ' ticket.');
                return;
            }
            const ticketId = this.getAttribute('data-ticket-id');
            
            showMessage(`Are you sure you want to cancel ticket ${ticketId}?`, true, () => {
                cancelTicket(ticketId);
            });
        });
    });

    document.querySelectorAll('.download-ticket-btn').forEach(button => {
        button.addEventListener('click', function() {
            showMessage(`Simulating download for ticket ${this.getAttribute('data-ticket-id')}.`);
        });
    });
}


function handleTrackBus() {
    const ticketId = trackingIdInput.value.trim();
    const trackingInfoElement = document.getElementById('tracking-info');
    const trackingMapElement = document.getElementById('tracking-map');

    if (!ticketId) {
        showMessage('Please enter a valid ticket number.');
        return;
    }

    const trackingData = busData.tracking.find(t => t.ticketId === ticketId);
    
    if (!trackingData) {
        trackingInfoElement.innerHTML = `<div class="tracking-error">No live tracking found for ticket ${ticketId}.</div>`;
        trackingMapElement.innerHTML = `<div class="map-placeholder">No live tracking data available</div>`;
        return;
    }
    
    displayBusTracking(trackingData, trackingInfoElement, trackingMapElement);
}

function displayBusTracking(data, trackingInfo, trackingMap) {
    trackingInfo.innerHTML = `
        <div class="tracking-header">
            <h3>Live Tracking Information</h3>
            <div class="tracking-status ${data.status.toLowerCase().includes('delay') ? 'delayed' : 'on-time'}">
                ${data.status}
            </div>
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
        </div>
    `;
    
    const progressPercent = calculateProgress(data.distanceRemaining);
    
    trackingMap.innerHTML = `
        <div class="map-simulation">
            <div class="map-route">
                <div class="map-progress-line">
                    <div class="map-progress" style="width: ${progressPercent}%"></div>
                </div>
                <div class="map-start-point" title="Starting Point"></div>
                <div class="map-current-location" title="Current Location: ${data.nextStop}" style="left: ${progressPercent}%"></div>
                <div class="map-end-point" title="Destination"></div>
            </div>
            <div class="map-labels">
                <div class="map-label">Start</div>
                <div class="map-label" style="text-align: center;">Current Location</div>
                <div class="map-label" style="text-align: right;">End</div>
            </div>
        </div>
    `;
}


function calculateProgress(distanceRemaining) {
    const distance = parseInt(distanceRemaining.replace(' km', ''));
    const totalDistance = 250;
    const progress = Math.max(0, Math.min(100, ((totalDistance - distance) / totalDistance) * 100));
    return progress;
}

hamburgerIcon.addEventListener('click', function() {
    sidebar.classList.toggle('active');
});

bookingForm.addEventListener('submit', handleSearchBuses);
trackBusBtn.addEventListener('click', handleTrackBus);

document.addEventListener('DOMContentLoaded', function() {
    initializeData();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travel-date').setAttribute('min', today);
});