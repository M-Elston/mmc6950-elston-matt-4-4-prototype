# The Good Wren - Food Assistance Locator (Formerly, Food Finder) Prototype

## Prototype Flow
- Users search AZ ZIP Code, explore matching resources on the map, select a resource marker, review its information card.
- Resource data remains temporary and hardcoded for prototype development
- Dynamic resource retrieval has not been implemented yet
- Search area results temporarily approximated to 5km radius of ZIP Codes

## Sept. 20th - 27th, 2026

### Data Array
- Copied over PoC code to adjust
- Added JavaScript data structure for multiple resources
- Added dynamic generation of resource markers
- Added temp, unconfirmed, resources (for testing)
- Added data fields to cards

### UI & Layout

#### Location Search
- Added ZIP Code search form
- Added 5-digit ZIP Code validation
- Added [Nominatim](https://nominatim.openstreetmap.org/) geocoding for ZIP searches
- Added map repositioning based on returned coordinates
- Added AZ-specific location validation
- Added geocoding validation and error handling
- Added marker toggling for searched ZIP Code results
- Added visual search area circle
- Added animated map repositioning via Leaflet ```flyTo```
- Added map dimming/spotlight effect around ZIP Code location circle
- Retouched search-area visualization (will style later)
- Ensured resource markers remain visible when map is dimmed

#### Resource Markers & Cards
- Added dynamic marker generation from resource array
- Added marker popups
- Added resource name & location
- Added resource address & service
- Added hours, contact, & availability fields
- Added expandable "More Information" toggle with HTML ```<details>``` and ```<summary>``` elements
- Added resource type & additional info to expandable section
- Added "Placeholder" text to resource fields pending later verification

#### Resource Filtering
- Added JavaScript filters by resource type
- Combined ZIP Code and resource filtering so markers match both conditions where applicable
- Added temp resources (placeholders) to test/verify filtering behavior within 85017
- Added filter focus handling

#### Stylization
- Compacted header section to maintain map-dominance
- Styled temp logo & ZIP Code search according to covnention
- Relocated Resource Filtering and Messaging as a floating overlay
- Integrated Messaging into Filter panel
- Added responsive styling for smaller screens
- Added and explored automatic map panning to improve popup card visibility (will need to return to this in future developement)

## Oct. 4th - 18th, 2026

### Database & Seed Data
- Compliled [AZ Governor's food-pantry directory](https://azgovernor.gov/food-pantry-resources-for-arizonans) data into a CSV with Excel
- CSV fields incluce: county, city, name, type, address, website, and phone
- Created new MongoDB Atlas database: goodWrenDB and collection: foodResources
- Imported 202 resource documents (from AZ Governor's) into MongoDB

### Backend
- Initialized `Node.js` with `package.json`
- Installed Express, MongdoDB Node.js, driver and dotenv
- Created `server.js` for Express API
- Configured env's in `.env` file
- Added .env to `.gitignore`
- Connected Express backend to MongoDB Atlas
- Configured database access to `goodWrenDB.foodResources`
- Added GET /api/health endpoint to verify backend
- Added GET /api/resources endpoint to retrive resource documents as JSON
- Verified successful database connection and API responses (locally)
- Used [U.S. Census Geocoder](https://geocoding.geo.census.gov/geocoder/) to match resource addresses to coordinates
- Generated `resource-coordinates.json` with 102 exact-match coordinate pairs out of 202 documents; remaining records not included due to lack of exact matches
- Updated GET /api/resources to return only approved coordinates, attached lat. and lon. to API responses
- Confirmed API responses contain only matches resources/coordinates leaving the database unchanged

### Frontend
- Deleted temp. resources
- Connected to GET /api/resources to load the real resources and display map markers
- Updated marker filtering to display resources within 5km of searched location
- Added `Clear Search` button to remove active search radias and overlay, restore markers, and preserve current map position with selected filters
- Updated filters to database type descriptions
- Updated map to display all markers on load-up and after clearing search (depending on filter selection)
- Tested functionality and flow