const map = L.map('map').setView([33.4484, -112.0740], 12);

// Layer 1: detailed map
const detailedMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

let searchArea;
let searchedZip = '';
let searchMask;

function createSearchMask(latitude, longitude, radius) {
    
    const points = [];
    const numberOfPoints = 64;

    for (let i = 0; i < numberOfPoints; i++) {
        const angle = (i / numberOfPoints) * 2 * Math.PI;

        const lat = latitude + (radius / 111320) * Math.cos(angle);
        const lon = longitude + (radius / (111320 * Math.cos(latitude * Math.PI / 180))) * Math.sin(angle);
        
        points.push([lat, lon]);
    }

    const outerBounds = [
        [90, -180],
        [90, 180],
        [-90, 180],
        [-90, -180]
    ];

    const newSearchMask = L.polygon(
        [outerBounds, points],
        {
            fillColor: '#555555',
            fillOpacity: 0.45,
            stroke: false,
            interactive: false
        }
    ).addTo(map);

    newSearchMask.bringToFront();

    if (searchMask) {
        map.removeLayer(searchMask);
    }

    searchMask = newSearchMask;
}

let foodResources = [];

async function loadFoodResources() {
    try {
        const response = await fetch('/api/resources');

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        foodResources = data.map(resource => {
            const address = resource.Address || '';
            const zipMatch = address.match(/\b\d{5}\b/);

            return {
                name: resource.Name || 'Unnamed Resource',
                locationName: resource.Name || '',
                address: address,
                city: resource.City || '',
                state: 'AZ',
                zip: zipMatch ? zipMatch[0] : '',
                latitude: resource.latitude,
                longitude: resource.longitude,
                type: resource.Type || 'Other',
                service: '',
                hours: 'Not provided',
                contact: resource['Phone Number'] || 'Not provided',
                availability: 'Contact resource for details',
                eligibility: 'Contact resource for details',
                additionalInfo: resource.Website || ''
            };
        });

        console.log(`Loaded ${foodResources.length} food resources.`);
    } catch (error) {
        console.error('Could not load food resources:', error);
        searchMessage.textContent = 'Could not load food resources. Please refresh the page.';
    }
}

// Markers per Resource
const resourceMarkers = [];

function createResourceMarkers() {
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
                    ${resource.city}, ${resource.state} ${resource.zip}
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
        `, {
            autoPan: true,
            autoPanPaddingTopLeft: [20, 140],
            autoPanPaddingBottomRight: [20, 20]
        });

        resourceMarkers.push({
            marker: marker,
            resource: resource
        });
    });
}

const searchForm = document.getElementById('location-search');
const zipInput = document.getElementById('zip-code');
const searchMessage = document.getElementById('search-message');
const clearSearchButton = document.getElementById('clear-search');
const filterCheckboxes = document.querySelectorAll('#resource-filters input[type="checkbox"]');

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371;
    const toRadians = degrees => degrees * Math.PI / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return earthRadius * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
}

function getResourceCategories(type) {
    const text = (type || '').toLowerCase();
    const categories = [];

    if (text.includes('food bank')) {
        categories.push('Food Bank');
    }

    if (text.includes('food pantry') || text.includes('food bank/pantry')) {
        categories.push('Food Pantry');
    }

    if (
        text.includes('community meal') ||
        text.includes('dinner service') ||
        text.includes('hot meal service') ||
        text.includes('soup kitchen')
    ) {
        categories.push('Community Meal');
    }

    if (text.includes('food distribution') || text.includes('food box')) {
        categories.push('Food Distribution');
    }

    return categories;
}

function updateResourceMarkers() {
    const selectedTypes = Array.from(filterCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    resourceMarkers.forEach(item => {
        const matchesZip = !searchArea || getDistanceKm(
            searchArea.getLatLng().lat,
            searchArea.getLatLng().lng,
            item.resource.latitude,
            item.resource.longitude
        ) <= 5;

        const matchesType = selectedTypes.length === 0 ||
            getResourceCategories(item.resource.type).some(category =>
                selectedTypes.includes(category)
            );

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

            if (searchArea) {
                map.removeLayer(searchArea);
            }

            searchArea = L.circle([latitude, longitude], {
                    radius: 5000,
                    fill: false,
                    color: '#666666',
                    weight: 2
                }).addTo(map);
                      
            updateResourceMarkers();

            map.flyTo([latitude, longitude], 12);

            map.once('moveend', function() {
                createSearchMask(latitude, longitude, 5000);
            });

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

clearSearchButton.addEventListener('click', function() {
    searchedZip = '';
    zipInput.value = '';
    searchMessage.textContent = '';

    if (searchArea) {
        map.removeLayer(searchArea);
        searchArea = null;
    }

    if (searchMask) {
        map.removeLayer(searchMask);
        searchMask = null;
    }

    updateResourceMarkers();
});

loadFoodResources().then(() => {
    createResourceMarkers();
    updateResourceMarkers();
});