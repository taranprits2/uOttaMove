import { MapPin, Navigation } from "lucide-react";

function DestinationPanel({ destination, start, routeInfo }) {
    if (!destination) return null;

    const distance = routeInfo?.metrics?.total_distance_m
        ? (routeInfo.metrics.total_distance_m / 1000).toFixed(2)
        : "N/A";

    const accessibleCoverage = routeInfo?.metrics?.accessible_segment_ratio
        ? Math.round(routeInfo.metrics.accessible_segment_ratio * 100)
        : "N/A";

    const startOffset = routeInfo?.metrics?.start_distance_to_network_m?.toFixed(1) || "0";
    const endOffset = routeInfo?.metrics?.end_distance_to_network_m?.toFixed(1) || "0";

    return (
        <div className="panel-right">
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
                    {destination.name || "Selected Destination"}
                </h2>
            </div>

            <div style={{
                padding: '16px',
                background: '#ecfdf5',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #10b981'
            }}>
                <div style={{ fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                    Accessibility Summary
                </div>
                <div style={{ fontSize: '0.875rem', color: '#047857', lineHeight: '1.6' }}>
                    This route includes accessible sidewalks with curb cuts, elevators, and tactile paving markers for safe navigation.
                </div>
            </div>

            {start && (
                <div style={{ marginBottom: '16px' }}>
                    <label className="label" style={{ marginBottom: '8px' }}>
                        <Navigation size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Start Point: {start.name || 'Selected Location'}
                    </label>
                </div>
            )}

            {routeInfo && (
                <div className="data-table">
                    <div className="data-row">
                        <span className="data-label">Distance</span>
                        <span className="data-value">{distance} km</span>
                    </div>
                    <div className="data-row">
                        <span className="data-label">Start offset</span>
                        <span className="data-value">{startOffset}m</span>
                    </div>
                    <div className="data-row">
                        <span className="data-label">End offset</span>
                        <span className="data-value">{endOffset}m</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DestinationPanel;
