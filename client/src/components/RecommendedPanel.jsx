import { useState, useRef, useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";

function RecommendedPanel({ onPlaceSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Ottawa-specific featured accessible places with coordinates
    const places = [
        {
            title: "Rideau Centre",
            lat: 45.4251,
            lng: -75.6919,
            rating: 4.6,
            description: "Shopping mall with accessible entrances, elevators, and wide corridors throughout.",
            accessibilityTags: ["Step-free", "Elevators", "Accessible washrooms"],
            isNew: false
        },
        {
            title: "Parliament Hill",
            lat: 45.4236,
            lng: -75.7009,
            rating: 4.8,
            description: "Historic site with accessible pathways, ramps, and guided tours with accessibility accommodations.",
            accessibilityTags: ["Ramps", "Accessible tours", "Tactile markers"],
            isNew: true
        },
        {
            title: "ByWard Market",
            lat: 45.4288,
            lng: -75.6927,
            rating: 4.5,
            description: "Public market with accessible pathways and vendor stalls at wheelchair height.",
            accessibilityTags: ["Wide pathways", "Accessible parking"],
            isNew: false
        }
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePlaceClick = (place) => {
        const location = {
            lat: place.lat,
            lng: place.lng,
            name: place.title
        };
        onPlaceSelect?.(location);
        setIsOpen(false);
    };

    return (
        <div className="featured-dropdown" ref={dropdownRef}>
            <button
                className="featured-dropdown-btn"
                onClick={() => setIsOpen(!isOpen)}
            >
                <MapPin size={16} />
                <span>Featured accessible places</span>
                <span className="badge">{places.length}</span>
                <ChevronDown size={16} style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div className="featured-dropdown-menu">
                    {places.map((place, idx) => (
                        <div
                            key={idx}
                            className="featured-place-item"
                            onClick={() => handlePlaceClick(place)}
                        >
                            <div className="featured-place-header">
                                <div className="featured-place-title">{place.title}</div>
                                {place.rating && (
                                    <div className="featured-place-rating">
                                        ⭐ {place.rating}
                                    </div>
                                )}
                            </div>
                            {place.description && (
                                <div className="featured-place-description">{place.description}</div>
                            )}
                            <div className="featured-place-tags">
                                {place.accessibilityTags.map((tag, i) => (
                                    <span key={i} className="pill pill-success">
                                        {tag}
                                    </span>
                                ))}
                                {place.isNew && <span className="badge-new">New listing</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default RecommendedPanel;
