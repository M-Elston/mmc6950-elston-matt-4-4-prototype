const map = L.map('map', {
    minZoom: 7,
    maxZoom: 18
}).setView([33.4484, -112.0740], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

const mapContainer = map.getContainer();

map.createPane('dimmingPane');
map.getPane('dimmingPane').style.zIndex = 450;
map.getPane('dimmingPane').style.pointerEvents = 'none';

const dimmingLayer = document.createElement('div');
dimmingLayer.id = 'map-dimming';
dimmingLayer.setAttribute('aria-hidden', 'true');
map.getPane('dimmingPane').appendChild(dimmingLayer);

function positionDimmingLayer() {
    const origin = map.containerPointToLayerPoint([0, 0]);
    const size = map.getSize();

    L.DomUtil.setPosition(dimmingLayer, origin);

    dimmingLayer.style.width = `${size.x}px`;
    dimmingLayer.style.height = `${size.y}px`;
}

map.on('move zoom resize', positionDimmingLayer);
positionDimmingLayer();

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
const filterToggle = document.getElementById('filter-toggle');
const resourceFilters = document.getElementById('resource-filters');

filterToggle.addEventListener('click', () => {
    const isOpen = resourceFilters.classList.toggle('is-open');
    filterToggle.setAttribute('aria-expanded', String(isOpen));
});

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

let cities = [];

async function loadCities() {
    try {
        const response = await fetch('/assets/city-coordinates.json');

        if (!response.ok) {
            throw new Error(`Unable to load cities: ${response.status}`);
        }

        cities = await response.json();
        createCityLabels();
        updateCityLabels();

    } catch (error) {
        console.error('Error loading city coordinates:', error);
    }
}

let cityElements = [];

function createCityLabels() {
    cityLabels.replaceChildren();

    cityElements = cities.map(city => {
        const element = document.createElement('span');
        element.className = 'city-label';
        element.textContent = city.name;
        cityLabels.appendChild(element);

        return { ...city, element };
    });
}

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

    const gradient = `radial-gradient(
        circle var(--spotlight-radius)
        at var(--spotlight-x) var(--spotlight-y),
        transparent 0%,
        transparent 70%,
        black 100%
    )`;

    dimming.style.webkitMaskImage = gradient;
    dimming.style.maskImage = gradient;

    dimming.style.setProperty('--spotlight-x', `${spotlight.x}px`);
    dimming.style.setProperty('--spotlight-y', `${spotlight.y}px`);
    dimming.style.setProperty('--spotlight-radius', `${spotlight.radius}px`);

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

    const radius = Math.abs(centerPoint.y - edgePoint.y);
    
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

function centerSelectedMarker(resource) {
    const zoom = 14;
    const markerPosition = L.latLng(
        resource.latitude,
        resource.longitude
    );

    if (window.innerWidth > 600) {
        map.setView(markerPosition, zoom, { animate: true });
        return;
    }

    const cardHeight = card.getBoundingClientRect().height;

    const offset = cardHeight / 2;

    const projected = map.project(markerPosition, zoom);

    const adjustedCenter = map.unproject(
        projected.add([0, offset]),
        zoom
    );

    map.setView(adjustedCenter, zoom, { animate: true });
}

function animateSpotlightZoom(event) {
    if (!selectedResource && !searchCenter) return;

    const lat = selectedResource
        ? selectedResource.latitude
        : searchCenter.lat;

    const lng = selectedResource
        ? selectedResource.longitude
        : searchCenter.lng;

    const radiusMeters = selectedResource ? 1800 : 5000;

    const center = L.latLng(lat, lng);

    const destination = L.latLng(
        lat + (radiusMeters / 111320),
        lng
    );

    const mapCenter = map.project(event.center, event.zoom);
    const mapSize = map.getSize().divideBy(2);

    const centerPoint = map.project(center, event.zoom)
        .subtract(mapCenter)
        .add(mapSize);

    const edgePoint = map.project(destination, event.zoom)
        .subtract(mapCenter)
        .add(mapSize);

    dimming.classList.add('zoom-animating');

    spotlight = {
        x: centerPoint.x,
        y: centerPoint.y,
        radius: Math.abs(centerPoint.y - edgePoint.y)
    };

    renderSpotlight();
}

map.on('move zoom resize', () => {
    if (!dimming.classList.contains('zoom-animating')) {
        refreshSpotlight();
    }
});

map.on('zoomanim', animateSpotlightZoom);

map.on('zoomend', () => {
    dimming.classList.remove('zoom-animating');
    refreshSpotlight();
});

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
    document.documentElement.style.setProperty(
        '--mobile-card-height',
        `${card.getBoundingClientRect().height}px`
    );
}

function closeResourceCard() {
    card.hidden = true;
    document.documentElement.style.setProperty(
        '--mobile-card-height',
        '0px'
    );
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

            centerSelectedMarker(resource);
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

loadCities();
loadFoodResources();
updateCityLabels();

/*Intro Modal*/

const introOverlay = document.getElementById('intro-overlay');
const introCard = document.getElementById('intro-card');
const introBegin = document.getElementById('intro-begin');

const appHeader = document.querySelector('.header');
const appMain = document.querySelector('.map-container');

appHeader.inert = true;
appMain.inert = true;
introCard.focus();

function closeIntroModal() {
    introOverlay.hidden = true;
    appHeader.inert = false;
    appMain.inert = false;
    zipInput.focus();
}

introBegin.addEventListener('click', closeIntroModal);

introOverlay.addEventListener('click', event => {
    if (event.target === introOverlay) {
        closeIntroModal();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !introOverlay.hidden) {
        closeIntroModal();
    }
});

introOverlay.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
        event.preventDefault();
        introBegin.focus();
    }
});
