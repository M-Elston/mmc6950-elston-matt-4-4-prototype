const map = L.map('map').setView([33.4484, -112.0740], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

const foodBank = L.marker([33.4806, -112.1253]).addTo(map);
    foodBank.bindPopup(`
        <div class="location-card">
            <h2>St. Mary's Food Bank</h2>
            <p class="location-name">Phoenix Neighborhood Food Center</p>
            <p>3131 W. Thomas Rd.<br>
            Phoenix, AZ 85017</p>
            <p class="service">Food Assistance Available</p>
        </div>
    `);
