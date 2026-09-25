# Food Finder (working title) Prototype

## Prototype Flow
- Users search AZ ZIP Code, explore matching resources on the map, select a resource marker, review its information card.
- Resource data remains temporary and hardcoded for prototype development
- Dynamic resource retrieval has not been implemented yet
- Search area results temporarily approximated to 5,000km radius of ZIP Codes

## Progress

### Data Array
- Copied over PoC code to adjust
- Added JavaScript data structure for multiple resources
- Added dynamic generation of resource markers
- Added temp, unconfirmed, resources (for testing)
- Added data fields to cards

### Location Search
- Added ZIP Code search form
- Added 5-digit ZIP Code validation
- Added [Nominatim](https://nominatim.openstreetmap.org/) geocoding for ZIP searches
- Added map repositioning based on returned coordinates
- Added AZ-specific location validation
- Added geocoding validation and error handling
- Added marker toggling for searched ZIP Code results
- Added visual search area circle
- Added animated map repositioning via Leaflet ```flyTo```

### Resource Markers & Cards
- Added dynamic marker generation from resource array
- Added marker popups
- Added resource name & location
- Added resource address & service
- Added hours, contact, & availability fields
- Added expandable "More Information" toggle with HTML ```<details>``` and ```<summary>``` elements
- Added resource type & additional info to expandable section
- Added "Placeholder" text to resource fields pending later verification

### Resource Filtering
- Added JavaScript filters by resource type
- Combined ZIP Code and resource filtering so markers match both conditions where applicable
- Added temp resources (placeholders) to test/verify filtering behavior within 85017
- Added filter focus handling
