const map = L.map('map').setView([33.4484, -112.0740], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Temp Data
const foodResources = [
    {
        name: "St. Mary's Food Bank",
        locationName: "Phoenix Neighborhood Food Center",
        address: "3131 W. Thomas Rd.",
        city: "Phoenix",
        state: "AZ",
        zip: "85017",
        latitude: 33.4806,
        longitude: -112.1253,
        type: "Food Bank",
        service: "Food Assistance Available"
    },

    {
        name: "Foothills Food Bank",
        locationName: "Foothills Food Bank",
        address: "6038 E. Hidden Valley Dr.",
        city: "Cave Creek",
        state: "AZ",
        zip: "85331",
        latitude: 33.7920,
        longitude: -111.9830,
        type: "Food Pantry",
        service: "Food Assistance Available" 
    },

    {
        name: "St. Mary's Food Bank",
        locationName: "Surprise Resource Center",
        address: "13050 W. Elm Street",
        city: "Surprise",
        state: "AZ",
        zip: "85378",
        latitude: 33.6390,
        longitude: -112.3340,
        type: "Food Bank",
        service: "Food Assistance Available" 
    }
];

// Markers per Resource
foodResources.forEach(resource => {
    const marker = L.marker([
        resource.latitude,
        resource.longitude
    ]).addTo(map);

    marker.bindPopup(`
        <div class="location-card">
            <h2>${resource.name}</h2>
            <p class="location-name">${resource.locationName}</p>
            <p>
                ${resource.address}<br>
                ${resource.city}, ${resource.state}, ${resource.zip}
            </p>
            <p class="service">${resource.service}</p>
        </div>
    `);
});

const searchForm = document.getElementById('location-search');
const zipInput = document.getElementById('zip-code');
const searchMessage = document.getElementById('search-message');

searchForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const zipCode = zipInput.value.trim();

    if (!/^\d{5}$/.test(zipCode)) {
        searchMessage.textContent = 'Please enter a valid 5-digit ZIP Code.';
        return;
    }

    searchMessage.textContent = `Searching...`;

    fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&countrycodes=us&format=json&addressdetails=1&limit=1`
    )
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                searchMessage.textContent = 'ZIP Code not found.';
                return;
            }

            const result = data[0];

            if (result.address?.state !== 'Arizona') {
                searchMessage.textContent = 'Please enter an Arizona ZIP Code.';
                return;
            }

            const latitude = parseFloat(data[0].lat);
            const longitude = parseFloat(data[0].lon);

            map.setView([latitude, longitude], 12);

            searchMessage.textContent = `Location found: ${zipCode}`;
        })
        .catch(error => {
            console.error('Geocoding error:', error);
            searchMessage.textContent = 'Could not find that location. Please try again.';
        });
});
