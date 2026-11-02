const map = L.map('map', {
    zoomControl: true
}).setView([33.4484, -112.0740], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

const mapContainer = map.getContainer();

const dimmingLayer = document.createElement('div');
dimmingLayer.id = 'map-dimming';
dimmingLayer.setAttribute('aria-hidden', 'true');
map.getContainer().appendChild(dimmingLayer);

const cityLabelLayer = document.createElement('div');
cityLabelLayer.id = 'city-labels';
cityLabelLayer.setAttribute('aria-hidden', 'true');
map.getContainer().appendChild(cityLabelLayer);



const searchForm = document.getElementById('location-search');
const zipInput = document.getElementById('zip-code');
const searchMessage = document.getElementById('search-message');
const clearSearchButton = document.getElementById('clear-search');
const filterCheckboxes = document.querySelectorAll(
    '#resource-filters input[type="checkbox"]'
);

const dimming = document.getElementById('map-dimming');
const cityLabels = document.getElementById('city-labels');
const card = document.getElementById('resource-card');
const cardContent = document.getElementById('resource-card-content');
const closeCardButton = document.getElementById('close-resource-card');

let foodResources = [];
let resourceMarkers = [];
let searchCenter = null;
let selectedResource = null;
let spotlight = null;

const cities = [
    { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
    { name: 'Glendale', lat: 33.5387, lng: -112.1860 },
    { name: 'Scottsdale', lat: 33.4942, lng: -111.9261 },
    { name: 'Tempe', lat: 33.4255, lng: -111.9400 },
    { name: 'Mesa', lat: 33.4152, lng: -111.8315 },
    { name: 'Paradise Valley', lat: 33.5312, lng: -111.9426 },
    { name: 'Chandler', lat: 33.3062, lng: -111.8413 },
    { name: 'Peoria', lat: 33.5806, lng: -112.2374 },
    { name: 'Gilbert', lat: 33.3528, lng: -111.7890 }
];

const cityElements = cities.map(city => {
    const element = document.createElement('span');
    element.className = 'city-label';
    element.textContent = city.name;
    cityLabels.appendChild(element);
    return { ...city, element };
});

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
    return map.distance(
        [lat1, lng1],
        [lat2, lng2]
    ) / 1000;
}

function getResourceCategories(type) {
    const text = (type || '').toLowerCase();
    const categories = [];

    if (text.includes('food bank')) categories.push('Food Bank');

    if (text.includes('food pantry') || text.includes('food bank/pantry')) {
        categories.push('Food Pantry');
    }

    if (text.includes('community meal') ||
        text.includes('dinner service') ||
        text.includes('hot meal service') ||
        text.includes('soup kitchen')) {
            categories.push('Community Meal');
        }

    if (text.includes('food distribution') || text.includes('food box')) {
        categories.push('Food Distribution');
    }

    return categories;
}

function updateCityLabels() {
    const currentZoom = map.getZoom();

    cityElements.forEach(city => {
        const point = map.latLngToContainerPoint([city.lat, city.lng]);

        city.element.style.left = `${point.x}px`;
        city.element.style.top = `${point.y}px`;

        const withinSpotlight = spotlight &&
            Math.hypot(
                point.x - spotlight.x,
                point.y - spotlight.y
            ) < spotlight.radius * 0.85;

        const visible =
            currentZoom >= 9 &&
            currentZoom <= 13 &&
            point.x > -120 &&
            point.x < map.getSize().x + 120 &&
            point.y > -30 &&
            point.y < map.getSize().y + 30 &&
            !withinSpotlight;

        city.element.style.display = visible ? 'block' : 'none';
    });
}

function renderSpotlight() {
    if (!spotlight) {
        dimming.style.webkitMaskImage = 'none';
        dimming.style.maskImage = 'none';
        updateCityLabels();
        return;
    }

    const { x, y, radius } = spotlight;

    const gradient = `radial-gradient(
        circle ${radius}px at ${x}px ${y}px,
        transparent 0%,
        transparent 70%,
        black 100%
    )`;

    dimming.style.webkitMaskImage = gradient;
    dimming.style.maskImage = gradient;
    updateCityLabels();
}

function setSpotlight(lat, lng, radiusMeters) {
    const center = L.latLng(lat, lng);
    const centerPoint = map.latLngToContainerPoint(center);

    const destination = L.latLng(
        lat + (radiusMeters / 111320),
        lng
    );

    const edgePoint = map.latLngToContainerPoint(destination);

    const radius = Math.max(
        75,
        Math.abs(centerPoint.y - edgePoint.y)
    );

    spotlight = {
        x: centerPoint.x,
        y: centerPoint.y,
        radius
    };

    renderSpotlight();
}

function refreshSpotlight() {
    if (selectedResource) {
        setSpotlight(
            selectedResource.latitude,
            selectedResource.longitude,
            1800
        );
    } else if (searchCenter) {
        setSpotlight(searchCenter.lat, searchCenter.lng, 5000);
    } else {
        spotlight = null;
        renderSpotlight();
    }
}

map.on('move zoom resize', refreshSpotlight);

const pinIcon = L.divIcon({
    className: 'resource-pin',
    html: '<div class="pin-shape"></div>',
    iconSize: [26, 35],
    iconAnchor: [13, 35]
});

function showResourceCard(resource) {
    const name = escapeHTML(resource.name);
    const type = escapeHTML(resource.type);
    const address = escapeHTML(resource.address);
    const city = escapeHTML(resource.city);
    const state = escapeHTML(resource.state);
    const zip = escapeHTML(resource.zip);
    const contact = escapeHTML(resource.contact);
    const hours = escapeHTML(resource.hours);
    const availability = escapeHTML(resource.availability);
    const eligibility = escapeHTML(resource.eligibility);

    let website = '';
    if (resource.additionalInfo) {
        try {
            const url = new URL(resource.additionalInfo);
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                website = `<p><a href="${escapeHTML(url.href)}"
                    target="_blank" rel="noopener noreferrer">
                    Resource website</a></p>`;
            }
        } catch (_) {
            website = `<p>${escapeHTML(resource.additionalInfo)}</p>`;
        }
    }

    cardContent.innerHTML = `
        <div class="card-heading">
            <span class="card-medallion" aria-hidden="true">🍴</span>
            <div>
                <h2>${name}</h2>
                <p class="card-type">${type}</p>
            </div>
        </div>

        <div class="card-row">
            <span class="card-row-icon" aria-hidden="true">⌖</span>
            <p>${address}<br>${city}, ${state} ${zip}</p>
        </div>

        <div class="card-row">
            <span class="card-row-icon" aria-hidden="true">☎</span>
            <p>${contact}</p>
        </div>

        <div class="card-row">
            <span class="card-row-icon" aria-hidden="true">◷</span>
            <p>Hours: ${hours}</p>
        </div>

        <span class="service-label">Provides Food Assistance</span>

        <details>
            <summary>More Information</summary>
            <div class="card-extra">
                <p><strong>Availability:</strong> ${availability}</p>
                <p><strong>Eligibility:</strong> ${eligibility}</p>
                ${website}
            </div>
        </details>
    `;

    card.hidden = false;
}

function closeResourceCard() {
    card.hidden = true;
    cardContent.innerHTML = '';
    selectedResource = null;
    refreshSpotlight();
}

closeCardButton.addEventListener('click', closeResourceCard);

function updateResourceMarkers() {
    const selectedTypes = Array.from(filterCheckboxes)
        .filter(box => box.checked)
        .map(box => box.value);

    resourceMarkers.forEach(({ marker, resource }) => {
        const matchesZip = !searchCenter ||
            getDistanceKm(
                searchCenter.lat,
                searchCenter.lng,
                resource.latitude,
                resource.longitude
            ) <= 5;

        const matchesType = selectedTypes.length === 0 ||
            getResourceCategories(resource.type).some(category =>
                selectedTypes.includes(category)
            );

        if (matchesZip && matchesType) {
            if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
            if (selectedResource === resource) closeResourceCard();
        }
    });
}

function createResourceMarkers() {
    resourceMarkers.forEach(({ marker }) => map.removeLayer(marker));
    resourceMarkers = [];

    foodResources.forEach(resource => {
        if (!Number.isFinite(resource.latitude) ||
            !Number.isFinite(resource.longitude)) return;

        const marker = L.marker(
            [resource.latitude, resource.longitude],
            { icon: pinIcon, title: resource.name }
        );

        marker.on('click', () => {
            selectedResource = resource;
            showResourceCard(resource);
            map.panTo([resource.latitude, resource.longitude], {
                animate: true
            });
            refreshSpotlight();
        });

        resourceMarkers.push({ marker, resource });
    });

    updateResourceMarkers();
}

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
                address,
                city: resource.City || '',
                state: 'AZ',
                zip: zipMatch ? zipMatch[0] : '',
                latitude: Number(resource.latitude),
                longitude: Number(resource.longitude),
                type: resource.Type || 'Other',
                hours: 'Not provided',
                contact: resource['Phone Number'] || 'Not provided',
                availability: 'Contact resource for details',
                eligibility: 'Contact resource for details',
                additionalInfo: resource.Website || ''
            };
        });

        createResourceMarkers();
    } catch (error) {
        console.error('Could not load food resources:', error);
        searchMessage.textContent =
            'Could not load resources. Please refresh the page.';
    }
}

searchForm.addEventListener('submit', async event => {
    event.preventDefault();

    const zip = zipInput.value.trim();

    if (!/^\d{5}$/.test(zip)) {
        searchMessage.textContent = 'Please enter a valid 5-digit ZIP Code.';
        return;
    }

    searchMessage.textContent = 'Searching...';

    try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('postalcode', zip);
        url.searchParams.set('countrycodes', 'us');
        url.searchParams.set('format', 'json');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '1');

        const response = await fetch(url);

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();

        if (!data.length) {
            searchMessage.textContent = 'ZIP Code not found.';
            return;
        }

        if (data[0].address?.state !== 'Arizona') {
            searchMessage.textContent = 'Please enter an Arizona ZIP Code.';
            return;
        }

        searchCenter = {
            lat: Number(data[0].lat),
            lng: Number(data[0].lon)
        };

        closeResourceCard();
        updateResourceMarkers();

        map.flyTo([searchCenter.lat, searchCenter.lng], 12);
        refreshSpotlight();

        searchMessage.textContent = `Location found: ${zip}`;
    } catch (error) {
        console.error('Geocoding error:', error);
        searchMessage.textContent =
            'Could not find that location. Please try again.';
    }
});

clearSearchButton.addEventListener('click', () => {
    zipInput.value = '';
    searchCenter = null;
    searchMessage.textContent = '';

    closeResourceCard();
    updateResourceMarkers();
    refreshSpotlight();
});

filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateResourceMarkers);
});

loadFoodResources();
updateCityLabels();