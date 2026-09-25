const map = L.map('map').setView([33.4484, -112.0740], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

let searchArea;
let searchedZip = '';

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
        service: "Food Assistance Available",
        hours: "Placeholder",
        contact: "Placeholder",
        availability: "Placeholder",
        eligibility: "Placeholder",
        additionalInfo: "Placeholder"
    },

    {
        name: "Placeholder Food Pantry",
        locationName: "Temp Test Location",
        address: "Placeholder Address",
        city: "Phoenix",
        state: "AZ",
        zip: "85017",
        latitude: 33.4650,
        longitude: -112.1100,
        type: "Food Pantry",
        service: "Placeholder - Food Assistance",
        hours: "Placeholder",
        contact: "Placeholder",
        availability: "Placeholder",
        eligibility: "Placeholder",
        additionalInfo: "Temp Testing Resource - Not a Real Listing."
    },

    {
        name: "Placeholder Community Meal",
        locationName: "Temp Test Location",
        address: "Placeholder Address",
        city: "Phoenix",
        state: "AZ",
        zip: "85017",
        latitude: 33.4950,
        longitude: -112.1400,
        type: "Community Meal",
        service: "Placeholder - Meal Service",
        hours: "Placeholder",
        contact: "Placeholder",
        availability: "Placeholder",
        eligibility: "Placeholder",
        additionalInfo: "Temp Testing Resource - Not a Real Listing."
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
        service: "Food Assistance Available",
        hours: "Placeholder",
        contact: "Placeholder",
        availability: "Placeholder",
        eligibility: "Placeholder",
        additionalInfo: "Placeholder" 
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
        service: "Food Assistance Available",
        hours: "Placeholder",
        contact: "Placeholder",
        availability: "Placeholder",
        eligibility: "Placeholder",
        additionalInfo: "Placeholder" 
    }
];

// Markers per Resource
const resourceMarkers = [];

foodResources.forEach(resource => {
    const marker = L.marker([
        resource.latitude,
        resource.longitude
    ]);

    marker.bindPopup(`
        <div class="location-card">
            <h2>${resource.name}</h2>
            <p class="location-name">${resource.locationName}</p>
            <p>
                ${resource.address}<br>
                ${resource.city}, ${resource.state}, ${resource.zip}
            </p>
            <p class="service">${resource.service}</p>
            <p><strong>Hours:</strong> ${resource.hours}</p>
            <p><strong>Contact:</strong> ${resource.contact}</p>
            <p><strong>Availability:</strong> ${resource.availability}</p>

            <details>
                <summary>More Information</summary>
                <p><strong>Resource Type:</strong> ${resource.type}</p>
                <p><strong>Eligibility:</strong> ${resource.eligibility}</p>
                <p>${resource.additionalInfo}</p>
            </details>
        </div>
    `);

    resourceMarkers.push({
        marker: marker,
        resource: resource
    });
});

const searchForm = document.getElementById('location-search');
const zipInput = document.getElementById('zip-code');
const searchMessage = document.getElementById('search-message');
const filterCheckboxes = document.querySelectorAll('#resource-filters input[type="checkbox"]');

function updateResourceMarkers() {
    const selectedTypes = Array.from(filterCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    resourceMarkers.forEach(item => {
        const matchesZip = item.resource.zip === searchedZip;
        const matchesType = selectedTypes.length === 0 ||
            selectedTypes.includes(item.resource.type);
        
        if (matchesZip && matchesType) {
            item.marker.addTo(map);
        } else {
            map.removeLayer(item.marker);
        }
    });
}

searchForm.addEventListener('submit', function(event) {
    event.preventDefault();

    zipInput.setSelectionRange(0, 0);
    zipInput.blur();

    const zipCode = zipInput.value.trim();

    if (!/^\d{5}$/.test(zipCode)) {
        searchMessage.textContent = 'Please enter a valid 5-digit ZIP Code.';
        return;
    }

    searchMessage.textContent = `Searching...`;

    resourceMarkers.forEach(item => {
        map.removeLayer(item.marker);
    });

    fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&countrycodes=us&format=json&addressdetails=1&limit=1`
    )
        .then(response => {
            if (!response.ok) {
                throw new Error(`Geocoding request failed: ${response.status}`);
            }
        
            return response.json();
        })

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

            const latitude = parseFloat(result.lat);
            const longitude = parseFloat(result.lon);

            searchedZip = zipCode;

            map.flyTo([latitude, longitude], 12);

            if (searchArea) {
                map.removeLayer(searchArea);
            }
                searchArea = L.circle([latitude, longitude], {
                    radius: 5000
                }).addTo(map);
            
            updateResourceMarkers();

            filterCheckboxes[0].focus();

            searchMessage.textContent = `Location found: ${zipCode}`;
        })
        
        .catch(error => {
            console.error('Geocoding error:', error);
            searchMessage.textContent = 'Could not find that location. Please try again.';
        });
});

filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateResourceMarkers);
});
