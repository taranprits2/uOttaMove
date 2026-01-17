const { searchPlaces } = require('./map_client');

async function getLocationDetails(locationName) {
  const results = await searchPlaces(locationName, { limit: 1 });
  if (!results?.length) return null;
  const place = results[0];
  return {
    id: place.place_id,
    name: place.display_name?.split(',')?.[0]?.trim() || locationName,
    displayName: place.display_name || locationName,
    coordinates: {
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon ?? place.lng),
    },
    address: place.address || {},
    source: 'nominatim',
    accessibility: {
      score: 60,
      description: 'Basic accessibility information unavailable; verify conditions on site.',
      confidence: 'low',
      issues: [],
      starRating: 3,
    },
    context: {
      amenities: [],
      features: [],
      tags: {},
    },
    reviews: [],
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getLocationDetails,
};