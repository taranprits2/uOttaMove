/**
 * Scoring model for wheelchair accessibility.
 * Returns a cost multiplier.
 * 1.0 = optimal
 * > 1.0 = suboptimal
 * Infinity = impassable
 */
exports.getSegmentCost = (tags, profile = 'wheelchair') => {
    let multiplier = 1.0;

    // 1. Check for steps
    if (tags.highway === 'steps') {
        return profile === 'wheelchair' ? Infinity : 2.0;
    }

    // 2. Check for footway/sidewalk
    // If it's a main road without sidewalk info, it's risky.
    // However, OSM often implies sidewalks on residential.
    // We'll trust 'footway', 'pedestrian', 'path', 'cycleway'.
    // 'service', 'residential' might be shared space or lack sidewalks.

    // Penalize surfaces
    if (tags.surface) {
        if (['cobblestone', 'gravel', 'dirt', 'sand', 'grass'].includes(tags.surface)) {
            multiplier *= 1.5;
        }
    }

    // Check kerbs (curbs) -> If we have node info, but here we evaluate ways.
    // Ideally curbs are on nodes (barrier=kerb).
    // For ways, we look for incline.

    // Incline
    if (tags.incline) {
        // Simple heuristic for now. "up", "down" or numeric.
        if (tags.incline !== '0' && tags.incline !== '0%') {
            multiplier *= 1.2;
        }
    }

    // Wheelchair specific tags
    if (tags.wheelchair === 'no') {
        return Infinity;
    }
    if (tags.wheelchair === 'designated' || tags.wheelchair === 'yes') {
        multiplier *= 0.8; // Bonus
    }

    return multiplier;
};
