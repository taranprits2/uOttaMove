import { useState } from 'react';
import { Navigation, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, RotateCcw, MapPin, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateDirections, estimateWalkingTime, formatDistance } from '../utils/directions';

function DirectionsPanel({ route, start, end }) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!route || !route.segments || route.segments.length === 0) {
        return null;
    }

    const directions = generateDirections(route.segments);
    const totalDistance = route.metrics?.total_distance_m || 0;
    const estimatedTime = estimateWalkingTime(totalDistance);

    const getTurnIcon = (type) => {
        switch (type) {
            case 'left':
                return <ArrowLeft size={20} />;
            case 'right':
                return <ArrowRight size={20} />;
            case 'sharp-left':
                return <ArrowUpLeft size={20} />;
            case 'sharp-right':
                return <ArrowUpRight size={20} />;
            case 'u-turn':
                return <RotateCcw size={20} />;
            case 'start':
                return <Navigation size={20} />;
            case 'arrive':
                return <MapPin size={20} />;
            default:
                return <ArrowUp size={20} />;
        }
    };

    const getAccessibilityWarning = (direction) => {
        if (!direction.accessible && direction.score < 0.5) {
            return 'Limited accessibility';
        }
        if (direction.issues && direction.issues.length > 0) {
            const criticalIssues = direction.issues.filter(issue =>
                issue.includes('steps') || issue.includes('kerb_high') || issue.includes('wheelchair_no')
            );
            if (criticalIssues.length > 0) {
                return 'Accessibility warning';
            }
        }
        return null;
    };

    return (
        <div className="directions-panel">
            <div className="directions-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="directions-title">
                    <Navigation size={18} style={{ marginRight: '8px' }} />
                    <span>Directions</span>
                </div>
                <div className="directions-summary">
                    <span className="directions-distance">{formatDistance(totalDistance)}</span>
                    <span className="directions-time">~{estimatedTime} min</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {isExpanded && (
                <div className="directions-list">
                    {directions.map((direction, index) => {
                        const warning = getAccessibilityWarning(direction);

                        return (
                            <div
                                key={index}
                                className={`direction-step ${direction.type === 'arrive' ? 'direction-arrive' : ''}`}
                            >
                                <div className="direction-icon">
                                    {getTurnIcon(direction.type)}
                                </div>
                                <div className="direction-content">
                                    <div className="direction-instruction">
                                        {direction.instruction}
                                    </div>
                                    {direction.distanceText !== '0 m' && (
                                        <div className="direction-distance-text">
                                            {direction.distanceText}
                                        </div>
                                    )}
                                    {warning && (
                                        <div className="direction-warning">
                                            <AlertTriangle size={14} />
                                            <span>{warning}</span>
                                        </div>
                                    )}
                                    {direction.issues && direction.issues.length > 0 && (
                                        <div className="direction-issues">
                                            {direction.issues.slice(0, 2).map((issue, i) => (
                                                <span key={i} className="issue-tag">
                                                    {issue.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default DirectionsPanel;
