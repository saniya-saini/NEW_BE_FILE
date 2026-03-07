
    let allBuses = [];
    let filteredBuses = [];

    async function loadBusData() {
      try {
        
        const response = await fetch('/api/busschedules');
        
        if (!response.ok) {
          throw new Error('Failed to load bus schedules');
        }
        
        const data = await response.json();
        allBuses = Array.isArray(data) ? data : (data?.busschedules || data?.buses || []);
        filteredBuses = [...allBuses];
        
        console.log(`✅ Loaded ${allBuses.length} buses from JSON`);
        renderBusList(filteredBuses);
        
      } catch (error) {
        console.warn('⚠ Could not load JSON file, using fallback data:', error);

        allBuses = [
          {
            route: "HR26",
            origin: "Chandigarh ISBT-43",
            destination: "Ambala Cantt",
            departure: "09:40",
            arrival: "10:15",
            duration: "35m",
            location: "ISBT Sector 43, Chandigarh",
            operator: "Haryana Roadways",
            status: "on-time"
          },
          {
            route: "PB21",
            origin: "Ludhiana Bus Stand",
            destination: "Patiala",
            departure: "09:55",
            arrival: "10:35",
            duration: "40m",
            location: "ISBT Ludhiana",
            operator: "Punjab Roadways",
            status: "boarding"
          },
          {
            route: "PB07",
            origin: "Amritsar",
            destination: "Jalandhar",
            departure: "10:05",
            arrival: "10:50",
            duration: "45m",
            location: "ISBT Amritsar",
            operator: "Punjab Roadways",
            status: "delayed"
          },
          {
            route: "SRS101",
            origin: "Delhi",
            destination: "Jaipur",
            departure: "03:10",
            arrival: "09:10",
            duration: "6 Hrs",
            location: "Delhi Bus Stand",
            operator: "SRS Travels(Private)",
            status: "on-time"
          },
          {
            route: "HR45",
            origin: "Kurukshetra",
            destination: "Karnal",
            departure: "11:10",
            arrival: "11:55",
            duration: "45m",
            location: "Kurukshetra Bus Stand",
            operator: "Haryana Roadways",
            status: "on-time"
          },
          {
            route: "KPS201",
            origin: "Bangalore",
            destination: "Pune",
            departure: "11:30",
            arrival: "20:30",
            duration: "9 Hrs",
            location: "Majestic Bus Stand, BLR",
            operator: "KPS Travels(Private)",
            status: "boarding"
          }
        ];
        
        filteredBuses = [...allBuses];
        renderBusList(filteredBuses);
      }
    }

    
    function renderBusList(buses = filteredBuses) {
      const container = document.getElementById('busListContainer');
      const resultsCount = document.getElementById('resultsCount');

      if (buses.length === 0) {
        container.innerHTML = `
          <div class="no-results">
            <div style="font-size: 64px; margin-bottom: 15px;">🔍</div>
            <h3>No buses found</h3>
            <p>Try adjusting your filters</p>
          </div>
        `;
        resultsCount.textContent = 'No buses found';
        return;
      }

      container.innerHTML = buses.map(bus => {
        const statusClass = bus.status.toLowerCase().replace(/-/g, '');
        const statusText = bus.status === 'on-time' ? 'On time' : 
                          bus.status === 'delayed' ? 'Delayed' : 
                          'Boarding';

        return `
          <div class="bus-item bus-grid" data-route="${bus.route}">
            <div class="route">${bus.route}</div>
            <div>${bus.origin}</div>
            <div>${bus.destination}</div>
            <div>${bus.departure}</div>
            <div>${bus.arrival}</div>
            <div>${bus.duration}</div>
            <div>${bus.location}</div>
            <div>${bus.operator}</div>
            <div class="status ${statusClass}">${statusText}</div>
          </div>
        `;
      }).join('');

      resultsCount.textContent = `Showing ${buses.length} bus${buses.length !== 1 ? 'es' : ''}`;
    }

    
    function applyFilters() {
      const timeFilter = document.getElementById('timeFilter').value;
      const operatorFilter = document.getElementById('operatorFilter').value;
      const originFilter = document.getElementById('originFilter').value.toLowerCase();
      const destinationFilter = document.getElementById('destinationFilter').value.toLowerCase();

      filteredBuses = allBuses.filter(bus => {
        let match = true;

        if (timeFilter && bus.departure < timeFilter) {
          match = false;
        }

        if (operatorFilter) {
          if (operatorFilter === 'Private') {
            match = match && bus.operator.includes('Private');
          } else {
            match = match && bus.operator === operatorFilter;
          }
        }

        if (originFilter) {
          match = match && bus.origin.toLowerCase().includes(originFilter);
        }

        if (destinationFilter) {
          match = match && bus.destination.toLowerCase().includes(destinationFilter);
        }

        return match;
      });

      renderBusList(filteredBuses);
    }

 
    function clearFilters() {
      document.getElementById('timeFilter').value = '';
      document.getElementById('operatorFilter').value = '';
      document.getElementById('originFilter').value = '';
      document.getElementById('destinationFilter').value = '';
      
      filteredBuses = [...allBuses];
      renderBusList(filteredBuses);
    }

    
    function openSearch() {
      document.getElementById('searchModal').classList.add('active');
      document.getElementById('searchInput').focus();
    }

    function closeSearch() {
      document.getElementById('searchModal').classList.remove('active');
      document.getElementById('searchInput').value = '';
      document.getElementById('searchResults').innerHTML = '';
    }

    document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('searchInput');
      
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const query = this.value.toLowerCase();
          const resultsContainer = document.getElementById('searchResults');

          if (!query) {
            resultsContainer.innerHTML = '';
            return;
          }

          // Use the currently filtered list if filters are applied,
          // otherwise fall back to all buses.
          const source = filteredBuses.length ? filteredBuses : allBuses;

          const results = source.filter(bus => {
            const route = (bus.route || '').toLowerCase();
            const origin = (bus.origin || '').toLowerCase();
            const destination = (bus.destination || '').toLowerCase();
            const operator = (bus.operator || '').toLowerCase();
            const location = (bus.location || '').toLowerCase();
            const status = (bus.status || '').toLowerCase();

            return (
              route.includes(query) ||
              origin.includes(query) ||
              destination.includes(query) ||
              operator.includes(query) ||
              location.includes(query) ||
              status.includes(query)
            );
          });

          if (results.length === 0) {
            resultsContainer.innerHTML = `
              <div style="text-align: center; padding: 20px; color: #718096;">
                <p>No results found for "${query}"</p>
              </div>
            `;
            return;
          }

          resultsContainer.innerHTML = results.map(bus => `
            <div class="search-result-item" onclick="selectSearchResult('${bus.route}')">
              <div class="search-result-route">${bus.route} - ${bus.operator}</div>
              <div class="search-result-info">
                ${bus.origin} → ${bus.destination} | ${bus.departure} - ${bus.arrival}
              </div>
            </div>
          `).join('');
        });
      }

     
      loadBusData();
    });

    function selectSearchResult(route) {
      closeSearch();
      
      const busElement = document.querySelector(`[data-route="${route}"]`);
      if (busElement) {
        busElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        busElement.style.background = '#fff3cd';
        setTimeout(() => {
          busElement.style.background = '';
        }, 2000);
      }
    }

    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeSearch();
      }
    });

  
    document.getElementById('searchModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeSearch();
      }
    });

    console.log('✅ Bus Schedule System Ready');