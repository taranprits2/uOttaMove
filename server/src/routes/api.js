const express = require('express');
const { searchPlaces, reverseGeocode } = require('../services/map_data/map_client');
const { getLocationDetails } = require('../services/map_data/location_details');
const { findAccessibleWalkingRoute } = require('../services/routing/walking_router');
const { planAccessibleTrip } = require('../services/routing/transit_router');
const { generateAccessibleRoute } = require('../services/routing/accessible_navigator');

const router = express.Router();

const FALLBACK_SEARCH_RESULTS = [
  {
    place_id: 'fallback-harbourfront',
    osm_type: 'way',
    osm_id: 9990001,
    lat: '43.6376',
    lon: '-79.3816',
    class: 'tourism',
    type: 'attraction',
    importance: 0.6,
    display_name: 'Harbourfront Centre, Toronto, Ontario, Canada',
    address: {
      attraction: 'Harbourfront Centre',
      city: 'Toronto',
      state: 'Ontario',
      country: 'Canada',
      country_code: 'ca',
    },
  },
  {
    place_id: 'fallback-rom',
    osm_type: 'way',
    osm_id: 9990002,
    lat: '43.6677',
    lon: '-79.3948',
    class: 'tourism',
    type: 'museum',
    importance: 0.65,
    display_name: 'Royal Ontario Museum, Bloor Street West, Toronto, Ontario, Canada',
    address: {
      museum: 'Royal Ontario Museum',
      road: 'Bloor Street West',
      city: 'Toronto',
      state: 'Ontario',
      country: 'Canada',
      country_code: 'ca',
    },
  },

  {
    place_id: 'fallback-eaton-centre',
    osm_type: 'way',
    osm_id: 9990003,
    lat: '43.6544',
    lon: '-79.3807',
    class: 'shop',
    type: 'mall',
    importance: 0.58,
    display_name: 'CF Toronto Eaton Centre, Yonge Street, Toronto, Ontario, Canada',
    address: {
      mall: 'CF Toronto Eaton Centre',
      road: 'Yonge Street',
      city: 'Toronto',
      state: 'Ontario',
      country: 'Canada',
      country_code: 'ca',
    },
  },
  {
    place_id: 'fallback-union',
    osm_type: 'way',
    osm_id: 9990004,
    lat: '43.6455',
    lon: '-79.3807',
    class: 'railway',
    type: 'station',
    importance: 0.63,
    display_name: 'Union Station, Front Street West, Toronto, Ontario, Canada',
    address: {
      railway: 'Union Station',
      road: 'Front Street West',
      city: 'Toronto',
      state: 'Ontario',
      country: 'Canada',
      country_code: 'ca',
    },
  },
  {
    place_id: 'fallback-city-hall',
    osm_type: 'way',
    osm_id: 9990005,
    lat: '43.6529',
    lon: '-79.3849',
    class: 'amenity',
    type: 'townhall',
    importance: 0.57,
    display_name: 'Toronto City Hall, Queen Street West, Toronto, Ontario, Canada',
    address: {
      townhall: 'Toronto City Hall',
      road: 'Queen Street West',
      city: 'Toronto',
      state: 'Ontario',
      country: 'Canada',
      country_code: 'ca',
    },
  },
];

function searchFallbackPlaces(query, limit = 5) {
  const normalized = query.toLowerCase();
  return FALLBACK_SEARCH_RESULTS.filter((place) => {
    const haystack = [
      place.display_name,
      place.address?.attraction,
      place.address?.road,
      place.address?.city,
      place.address?.townhall,
      place.address?.railway,
      place.address?.mall,
      place.address?.museum,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  }).slice(0, limit);
}

async function geocodeSingle(query) {
  const results = await searchPlaces(query, { limit: 1 });
  if (!results || !results.length) {
    return null;
  }
  const [place] = results;
  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon ?? place.lng);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  const label = place.display_name?.split(',')?.[0]?.trim() || place.display_name || query;
  return {
    lat,
    lon,
    label,
    raw: place,
  };
}

router.get('/map/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'query parameter is required' });
  }
  try {
    const limit = Number(req.query.limit) || 5;
    const results = await searchPlaces(query, { limit });
    return res.json({ results });
  } catch (err) {
    console.error('map/search failed', err);
    const limit = Number(req.query.limit) || 5;
    const fallback = searchFallbackPlaces(query, limit);
    if (fallback.length) {
      return res.json({
        results: fallback,
        source: 'fallback',
      });
    }
    return res.status(502).json({ error: 'failed_to_fetch_places' });
  }
});

router.get('/map/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (lat == null || lon == null) {
    return res.status(400).json({ error: 'lat and lon parameters are required' });
  }
  try {
    const result = await reverseGeocode(Number(lat), Number(lon));
    return res.json({ result });
  } catch (err) {
    console.error('map/reverse failed', err);
    return res.status(502).json({ error: 'failed_to_reverse_geocode' });
  }
});

router.post('/map/location-details', async (req, res) => {
  const { locationName } = req.body || {};
  if (!locationName || typeof locationName !== 'string') {
    return res.status(400).json({ error: 'locationName is required' });
  }
  try {
    const details = await getLocationDetails(locationName);
    if (!details) {
      return res.status(404).json({ error: 'location_not_found' });
    }
    return res.json({ details });
  } catch (err) {
    console.error('map/location-details failed', err);
    return res.status(502).json({ error: 'failed_to_fetch_location_details' });
  }
});


router.post('/routes/walking', async (req, res) => {
  const { start, end, options = {} } = req.body || {};
  if (!start || !end || typeof start.lat !== 'number' || typeof start.lon !== 'number') {
    return res.status(400).json({ error: 'start.lat and start.lon are required numbers' });
  }
  if (typeof end.lat !== 'number' || typeof end.lon !== 'number') {
    return res.status(400).json({ error: 'end.lat and end.lon are required numbers' });
  }
  try {
    const result = findAccessibleWalkingRoute([start.lat, start.lon], [end.lat, end.lon], options);
    if (!result.success) {
      return res.status(404).json({ error: result.reason || 'route_not_found' });
    }
    return res.json({ route: result });
  } catch (err) {
    console.error('routes/walking failed', err);
    return res.status(500).json({ error: 'routing_failed' });
  }
});

router.post('/routes/transit', async (req, res) => {
  const { start, end, options = {} } = req.body || {};
  if (!start || !end || typeof start.lat !== 'number' || typeof start.lon !== 'number') {
    return res.status(400).json({ error: 'start.lat and start.lon are required numbers' });
  }
  if (typeof end.lat !== 'number' || typeof end.lon !== 'number') {
    return res.status(400).json({ error: 'end.lat and end.lon are required numbers' });
  }
  try {
    const trip = await planAccessibleTrip(
      [start.lat, start.lon],
      [end.lat, end.lon],
      { ...options, useTransit: true },
    );
    return res.json({ trip });
  } catch (err) {
    console.error('routes/transit failed', err);
    return res.status(500).json({ error: 'transit_routing_failed' });
  }
});

router.post('/routes/navigate', async (req, res) => {
  const {
    currentLocation,
    destination,
    disabilityType = 'wheelchair',
    transportationMode = 'walking',
  } = req.body || {};

  if (!currentLocation) {
    return res.status(400).json({ success: false, error: 'current_location_required' });
  }
  if (!destination) {
    return res.status(400).json({ success: false, error: 'destination_required' });
  }

  try {
    let startCoord;
    if (typeof currentLocation === 'string') {
      const geocoded = await geocodeSingle(currentLocation);
      if (!geocoded) {
        return res.status(404).json({
          success: false,
          error: 'current_location_not_found',
        });
      }
      startCoord = {
        lat: geocoded.lat,
        lon: geocoded.lon,
        label: geocoded.label,
      };
    } else if (
      typeof currentLocation === 'object' &&
      currentLocation !== null &&
      typeof currentLocation.lat === 'number' &&
      (typeof currentLocation.lon === 'number' || typeof currentLocation.lng === 'number')
    ) {
      startCoord = {
        lat: currentLocation.lat,
        lon:
          typeof currentLocation.lon === 'number'
            ? currentLocation.lon
            : currentLocation.lng,
        label: currentLocation.label || currentLocation.name || null,
      };
    } else {
      return res.status(400).json({ success: false, error: 'invalid_current_location_format' });
    }

    let destinationCoord;
    if (typeof destination === 'string') {
      const geocodedDest = await geocodeSingle(destination);
      if (!geocodedDest) {
        return res.status(404).json({
          success: false,
          error: 'destination_not_found',
        });
      }
      destinationCoord = {
        lat: geocodedDest.lat,
        lon: geocodedDest.lon,
        label: geocodedDest.label,
        name: geocodedDest.label,
      };
    } else if (
      typeof destination === 'object' &&
      destination !== null &&
      typeof destination.lat === 'number' &&
      (typeof destination.lon === 'number' || typeof destination.lng === 'number')
    ) {
      destinationCoord = {
        lat: destination.lat,
        lon:
          typeof destination.lon === 'number'
            ? destination.lon
            : destination.lng,
        label: destination.label || destination.name || null,
        name: destination.name || destination.label || null,
      };
    } else {
      return res.status(400).json({ success: false, error: 'invalid_destination_format' });
    }

    const route = await generateAccessibleRoute({
      start: startCoord,
      end: destinationCoord,
      disabilityType,
      transportationMode,
    });

    return res.json({
      success: true,
      route,
    });
  } catch (err) {
    console.error('routes/navigate failed', err);
    if (err.code === 'no_accessible_route') {
      return res.status(404).json({
        success: false,
        error: err.code,
        details: err.details || null,
      });
    }
    return res.status(500).json({ success: false, error: 'routing_failed' });
  }
});

module.exports = router;
