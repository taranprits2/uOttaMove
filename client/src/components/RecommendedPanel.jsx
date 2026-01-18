import PlaceCard from "./PlaceCard";

function RecommendedPanel() {
    // Ottawa-specific featured accessible places
    const places = [
        {
            title: "Rideau Centre",
            rating: 4.6,
            description: "Shopping mall with accessible entrances, elevators, and wide corridors throughout.",
            accessibilityTags: ["Step-free", "Elevators", "Accessible washrooms"],
            isNew: false
        },
        {
            title: "Parliament Hill",
            rating: 4.8,
            description: "Historic site with accessible pathways, ramps, and guided tours with accessibility accommodations.",
            accessibilityTags: ["Ramps", "Accessible tours", "Tactile markers"],
            isNew: true
        },
        {
            title: "ByWard Market",
            rating: 4.5,
            description: "Public market with accessible pathways and vendor stalls at wheelchair height.",
            accessibilityTags: ["Wide pathways", "Accessible parking"],
            isNew: false
        }
    ];


    return (
        <div className="panel-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', margin: 0 }}>
                    Featured accessible places
                </h2>
                <span className="badge">{places.length}</span>
            </div>

            {places.map((place, idx) => (
                <PlaceCard key={idx} {...place} />
            ))}
        </div>
    );
}

export default RecommendedPanel;
