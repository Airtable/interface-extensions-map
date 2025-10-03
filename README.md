# Map Interface Extension for Airtable

This Airtable Interface Extension displays your records on a fullscreen interactive map using
Mapbox. It automatically geocodes addresses and displays pins for each location.

## Features

-   **Fullscreen map**: Renders a fullscreen map with pins for each record containing location data
-   **Automatic geocoding**: Converts addresses to coordinates using the Mapbox Geocoding API
-   **In-memory caching**: Geocoding results are cached in-memory during the session (no writes to
    Airtable)
-   **Saved view state**: Remembers your last map position/zoom per base/table in localStorage
-   **Configurable behavior**: Toggle zoom-to-pin on click and auto-centering on initial load
-   **Interactive pins**: Click pins to zoom and open record details (if permitted)
-   **Dark mode support**: Automatically switches map style based on system theme
-   **Real-time updates**: Map updates automatically when records change

## Setup

### 1. Configure Custom Properties

Before using this extension, you need to configure the following custom properties in your Airtable
interface:

-   **Mapbox API Key**: Your Mapbox API access token (get one at `https://mapbox.com`)
-   **Location Name Field**: Text field containing the location name/title
-   **Address Field**: Text field containing the full address to geocode
-   **Zoom to pin on click** (boolean): When enabled, clicking a pin zooms in and opens record
    details if allowed
-   **Disable center map on load** (boolean): When enabled, the map will not auto-fit to pins on
    first load

### 2. Mapbox API Key

1. Sign up for a free Mapbox account at https://mapbox.com
2. Create an API access token with the following scopes:
    - `styles:read`
    - `geocoding:read`
3. Copy the token and paste it into the "Mapbox API Key" custom property

### 3. Field Configuration

Make sure your Airtable table has the following fields:

-   A text field for location names
-   A text field for addresses (e.g., "123 Main St, New York, NY")

Note: This extension does not create or update latitude/longitude or cache fields in Airtable. All
geocoding is performed client-side and only cached in memory for the duration of the session.

## How It Works

1. **Initial load**: The extension reads relevant records from the table specified on the interface
   page, with filters applied (if any are defined).
2. **Geocoding**: For records with addresses, it calls the Mapbox Geocoding API in the browser
3. **Caching**: Results are cached in-memory during the session; no data is written back to Airtable
4. **Map display**: All geocoded locations are displayed as pins on the map
5. **Interaction**: Clicking a pin zooms to the location and, if permitted, opens the record detail
   page. If the Interface page shows a record details panel, the zoom is offset so the pin remains
   centered in the visible area
6. **View state**: On first load, the map auto-fits to your pins unless disabled. Your last view is
   saved to localStorage and restored on subsequent loads

## Permissions

The extension requires the following permissions:

-   Read access to view records
-   Record expansion permission (optional) to open record detail pages

## Rate Limits

-   **Mapbox Geocoding API**: Subject to your Mapbox account limits. Requests are made client-side
    as needed and results are cached in memory for the current session. Requests are made using the
    temporary Geocoding API.

## Troubleshooting

**Map not loading**: Check that your Mapbox API key is valid and has the required scopes.

**Geocoding not working**: Verify your Mapbox API key has geocoding permissions and you haven't
exceeded rate limits.

**Record details not opening**: Check that the interface has permission to expand records and that
the Interface page's "Click into record details" toggle is enabled.

**View not remembered**: localStorage may be blocked by the browser or cleared between sessions.

---

## Security note

The Mapbox API key is stored as an Interface Extension custom property configured by the builder; it
is not hard-coded in the extension. However, the token is still exposed when the extension is
running in the browser. We recommend using mechanisms such as URL restrictions to reduce the chances
of unauthorized use.
