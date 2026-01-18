/**
 * Utility functions for generating turn-by-turn directions from route segments
 */

/**
 * Calculate the bearing (compass direction) between two points
 * @param {[number, number]} point1 - [lat, lon]
 * @param {[number, number]} point2 - [lat, lon]
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(point1, point2) {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;

    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
}

/**
 * Determine turn direction based on bearing change
 * @param {number} bearing1 - Previous bearing
 * @param {number} bearing2 - Current bearing
 * @returns {string} 'left', 'right', 'straight', 'sharp-left', 'sharp-right', 'u-turn'
 */
export function getTurnDirection(bearing1, bearing2) {
    let angle = bearing2 - bearing1;

    // Normalize to -180 to 180
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    const absAngle = Math.abs(angle);

    if (absAngle < 20) return 'straight';
    if (absAngle > 160) return 'u-turn';

    if (angle > 0) {
        // Right turn
        if (absAngle > 90) return 'sharp-right';
        return 'right';
    } else {
        // Left turn
        if (absAngle > 90) return 'sharp-left';
        return 'left';
    }
}

/**
 * Get cardinal direction from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Generate turn-by-turn directions from route segments
 * @param {Array} segments - Route segments from API
 * @returns {Array} Array of direction instructions
 */
export function generateDirections(segments) {
    if (!segments || segments.length === 0) {
        return [];
    }

    const directions = [];
    let totalDistance = 0;

    // Add starting instruction
    if (segments[0]?.path && segments[0].path.length > 1) {
        const startBearing = calculateBearing(segments[0].path[0], segments[0].path[1]);
        const startDirection = getCardinalDirection(startBearing);

        directions.push({
            type: 'start',
            instruction: `Head ${startDirection}`,
            distance: segments[0].length || 0,
            distanceText: formatDistance(segments[0].length || 0),
            issues: segments[0].issues || [],
            accessible: segments[0].accessible,
            score: segments[0].score,
        });

        totalDistance += segments[0].length || 0;
    }

    // Process remaining segments
    for (let i = 1; i < segments.length; i++) {
        const prevSegment = segments[i - 1];
        const currentSegment = segments[i];

        if (!prevSegment.path || !currentSegment.path) continue;
        if (prevSegment.path.length < 2 || currentSegment.path.length < 2) continue;

        // Calculate bearings
        const prevPath = prevSegment.path;
        const currPath = currentSegment.path;

        const prevBearing = calculateBearing(
            prevPath[prevPath.length - 2],
            prevPath[prevPath.length - 1]
        );

        const currBearing = calculateBearing(
            currPath[0],
            currPath[1]
        );

        const turnType = getTurnDirection(prevBearing, currBearing);

        // Generate instruction text
        let instruction = '';
        switch (turnType) {
            case 'left':
                instruction = 'Turn left';
                break;
            case 'right':
                instruction = 'Turn right';
                break;
            case 'sharp-left':
                instruction = 'Turn sharp left';
                break;
            case 'sharp-right':
                instruction = 'Turn sharp right';
                break;
            case 'u-turn':
                instruction = 'Make a U-turn';
                break;
            case 'straight':
                instruction = 'Continue straight';
                break;
            default:
                instruction = 'Continue';
        }

        const distance = currentSegment.length || 0;
        totalDistance += distance;

        directions.push({
            type: turnType,
            instruction,
            distance,
            distanceText: formatDistance(distance),
            issues: currentSegment.issues || [],
            accessible: currentSegment.accessible,
            score: currentSegment.score,
            confidence: currentSegment.confidence,
        });
    }

    // Add arrival instruction
    directions.push({
        type: 'arrive',
        instruction: 'Arrive at destination',
        distance: 0,
        distanceText: '0 m',
        issues: [],
        accessible: true,
    });

    return directions;
}

/**
 * Estimate walking time in minutes
 * @param {number} distanceMeters - Distance in meters
 * @param {number} speedMps - Walking speed in meters per second (default: 1.15 m/s)
 * @returns {number} Estimated time in minutes
 */
export function estimateWalkingTime(distanceMeters, speedMps = 1.15) {
    if (!distanceMeters || distanceMeters <= 0) return 0;
    return Math.ceil(distanceMeters / speedMps / 60);
}
