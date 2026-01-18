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

    // Add starting instruction with street name
    if (segments[0]?.path && segments[0].path.length > 1) {
        const startBearing = calculateBearing(segments[0].path[0], segments[0].path[1]);
        const startDirection = getCardinalDirection(startBearing);
        const streetName = segments[0].tags?.name || segments[0].tags?.['addr:street'];

        const instruction = streetName
            ? `Head ${startDirection} on ${streetName}`
            : `Head ${startDirection}`;

        directions.push({
            type: 'start',
            instruction,
            distance: segments[0].length || 0,
            distanceText: formatDistance(segments[0].length || 0),
            issues: segments[0].issues || [],
            accessible: segments[0].accessible,
            score: segments[0].score,
            streetName,
        });

        totalDistance += segments[0].length || 0;
    }

    // Process remaining segments and consolidate consecutive "straight" moves
    let i = 1;
    while (i < segments.length) {
        const prevSegment = segments[i - 1];
        const currentSegment = segments[i];

        if (!prevSegment.path || !currentSegment.path) {
            i++;
            continue;
        }
        if (prevSegment.path.length < 2 || currentSegment.path.length < 2) {
            i++;
            continue;
        }

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
        const streetName = currentSegment.tags?.name || currentSegment.tags?.['addr:street'];

        // If it's a straight continuation, consolidate with following straight segments
        if (turnType === 'straight') {
            let consolidatedDistance = currentSegment.length || 0;
            let consolidatedIssues = [...(currentSegment.issues || [])];
            let consolidatedAccessible = currentSegment.accessible;
            let consolidatedScore = currentSegment.score;
            let lastStreetName = streetName;
            let j = i + 1;

            // Look ahead and consolidate consecutive straight segments on the same street
            while (j < segments.length) {
                const nextSegment = segments[j];
                if (!nextSegment.path || nextSegment.path.length < 2) break;

                const nextPrevPath = segments[j - 1].path;
                const nextCurrPath = nextSegment.path;

                const nextPrevBearing = calculateBearing(
                    nextPrevPath[nextPrevPath.length - 2],
                    nextPrevPath[nextPrevPath.length - 1]
                );

                const nextCurrBearing = calculateBearing(
                    nextCurrPath[0],
                    nextCurrPath[1]
                );

                const nextTurnType = getTurnDirection(nextPrevBearing, nextCurrBearing);
                const nextStreetName = nextSegment.tags?.name || nextSegment.tags?.['addr:street'];

                // Only consolidate if it's also straight and on the same street (or both have no street name)
                if (nextTurnType === 'straight' &&
                    (nextStreetName === lastStreetName || (!nextStreetName && !lastStreetName))) {
                    consolidatedDistance += nextSegment.length || 0;
                    consolidatedIssues.push(...(nextSegment.issues || []));
                    if (!nextSegment.accessible) consolidatedAccessible = false;
                    lastStreetName = nextStreetName || lastStreetName;
                    j++;
                } else {
                    break;
                }
            }

            // Create consolidated instruction
            const instruction = lastStreetName
                ? `Continue on ${lastStreetName}`
                : 'Continue straight';

            directions.push({
                type: 'straight',
                instruction,
                distance: consolidatedDistance,
                distanceText: formatDistance(consolidatedDistance),
                issues: [...new Set(consolidatedIssues)], // Remove duplicates
                accessible: consolidatedAccessible,
                score: consolidatedScore,
                streetName: lastStreetName,
            });

            totalDistance += consolidatedDistance;
            i = j; // Skip the consolidated segments
        } else {
            // It's a turn - create instruction with street name and distance
            let instruction = '';
            const nextDistance = currentSegment.length || 0;
            const distancePrefix = nextDistance > 0 ? `In ${formatDistance(nextDistance)}, ` : '';

            switch (turnType) {
                case 'left':
                    instruction = streetName
                        ? `${distancePrefix}turn left onto ${streetName}`
                        : `${distancePrefix}turn left`;
                    break;
                case 'right':
                    instruction = streetName
                        ? `${distancePrefix}turn right onto ${streetName}`
                        : `${distancePrefix}turn right`;
                    break;
                case 'sharp-left':
                    instruction = streetName
                        ? `${distancePrefix}turn sharp left onto ${streetName}`
                        : `${distancePrefix}turn sharp left`;
                    break;
                case 'sharp-right':
                    instruction = streetName
                        ? `${distancePrefix}turn sharp right onto ${streetName}`
                        : `${distancePrefix}turn sharp right`;
                    break;
                case 'u-turn':
                    instruction = 'Make a U-turn';
                    break;
                default:
                    instruction = streetName
                        ? `Continue on ${streetName}`
                        : 'Continue';
            }

            // Capitalize first letter
            instruction = instruction.charAt(0).toUpperCase() + instruction.slice(1);

            totalDistance += nextDistance;

            directions.push({
                type: turnType,
                instruction,
                distance: nextDistance,
                distanceText: formatDistance(nextDistance),
                issues: currentSegment.issues || [],
                accessible: currentSegment.accessible,
                score: currentSegment.score,
                confidence: currentSegment.confidence,
                streetName,
            });

            i++;
        }
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
