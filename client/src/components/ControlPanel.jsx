import { MapPin, Navigation, Accessibility, History } from "lucide-react";

function ControlPanel({ start, end, selectionMode, setSelectionMode, onGetRoute, loading, routeInfo }) {
    return (
        <div className="card">
            <div className="h1">uOttaHack</div>
            <p className="subtitle">Accessibility-aware navigation for everyone.</p>

            <div className="input-group">
                <label className="label">
                    <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Start Point
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="input" style={{
                        background: '#f1f5f9',
                        color: start ? '#0f172a' : '#64748b',
                        border: selectionMode === 'start' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        flex: 1
                    }}>
                        {start ? `${start.lat.toFixed(4)}, ${start.lng.toFixed(4)}` : "Click on map..."}
                    </div>
                    <button
                        className={`btn ${selectionMode === 'start' ? 'btn-active' : 'btn-outline'}`}
                        style={{ width: 'auto', padding: '8px 12px' }}
                        onClick={() => setSelectionMode('start')}
                    >
                        Select
                    </button>
                </div>
            </div>

            <div className="input-group">
                <label className="label">
                    <Navigation size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Destination
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="input" style={{
                        background: '#f1f5f9',
                        color: end ? '#0f172a' : '#64748b',
                        border: selectionMode === 'end' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        flex: 1
                    }}>
                        {end ? `${end.lat.toFixed(4)}, ${end.lng.toFixed(4)}` : "Click on map..."}
                    </div>
                    <button
                        className={`btn ${selectionMode === 'end' ? 'btn-active' : 'btn-outline'}`}
                        style={{ width: 'auto', padding: '8px 12px' }}
                        onClick={() => setSelectionMode('end')}
                    >
                        Select
                    </button>
                </div>
            </div>

            <button
                className="btn"
                onClick={onGetRoute}
                disabled={!start || !end || loading}
            >
                {loading ? "Calculating..." : "Find Accessible Route"}
            </button>

            {routeInfo && (
                <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #10b981' }}>
                    <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '8px' }}>Route Details</div>
                    <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                        Distance: {(routeInfo.metrics?.total_distance_m / 1000).toFixed(2)} km
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                        Accessible: {Math.round(routeInfo.metrics?.accessible_segment_ratio * 100)}%
                    </div>

                    {routeInfo.segments && routeInfo.segments.some(s => s.issues && s.issues.length > 0) && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #10b981' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#065f46', marginBottom: '8px' }}>Route Obstacles</div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: '#047857' }}>
                                {[...new Set(routeInfo.segments.flatMap(s => s.issues))].map((issue, i) => (
                                    <li key={i}>{issue.replace(/_/g, ' ')}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ControlPanel;
