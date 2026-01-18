import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Filter, User, Loader2, X, Navigation } from "lucide-react";
import { searchPlaces } from "../services/api";

function Header({ onLocationSelect, onStartLocationSelect, onCurrentLocationClick, onFilterChange, currentFilter }) {
    const [destinationQuery, setDestinationQuery] = useState("");
    const [startQuery, setStartQuery] = useState("");
    const [destinationResults, setDestinationResults] = useState([]);
    const [startResults, setStartResults] = useState([]);
    const [isSearchingDestination, setIsSearchingDestination] = useState(false);
    const [isSearchingStart, setIsSearchingStart] = useState(false);
    const [showDestinationResults, setShowDestinationResults] = useState(false);
    const [showStartResults, setShowStartResults] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const destinationRef = useRef(null);
    const startRef = useRef(null);
    const filterRef = useRef(null);

    // Debounced search for destination
    useEffect(() => {
        if (!destinationQuery.trim()) {
            setDestinationResults([]);
            setShowDestinationResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingDestination(true);
            try {
                const results = await searchPlaces(destinationQuery, { limit: 8 });
                setDestinationResults(results);
                setShowDestinationResults(true);
            } catch (error) {
                console.error("Search error:", error);
                setDestinationResults([]);
            } finally {
                setIsSearchingDestination(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [destinationQuery]);

    // Debounced search for start location
    useEffect(() => {
        if (!startQuery.trim()) {
            setStartResults([]);
            setShowStartResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingStart(true);
            try {
                const results = await searchPlaces(startQuery, { limit: 8 });
                setStartResults(results);
                setShowStartResults(true);
            } catch (error) {
                console.error("Search error:", error);
                setStartResults([]);
            } finally {
                setIsSearchingStart(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [startQuery]);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (destinationRef.current && !destinationRef.current.contains(event.target)) {
                setShowDestinationResults(false);
            }
            if (startRef.current && !startRef.current.contains(event.target)) {
                setShowStartResults(false);
            }
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilterMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDestinationResultClick = (result) => {
        const locationName = result.name || result.display_name?.split(',')[0] || "Selected Location";
        const location = { lat: result.lat, lng: result.lon, name: locationName };
        onLocationSelect?.(location, result.display_name);
        setDestinationQuery("");
        setShowDestinationResults(false);
    };

    const handleStartResultClick = (result) => {
        const locationName = result.name || result.display_name?.split(',')[0] || "Selected Location";
        const location = { lat: result.lat, lng: result.lon, name: locationName };
        onStartLocationSelect?.(location, result.display_name);
        setStartQuery("");
        setShowStartResults(false);
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                onCurrentLocationClick?.(location);
                setIsGettingLocation(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert(`Unable to get your location: ${error.message}`);
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const filterOptions = [
        { value: 'all', label: 'All Routes', threshold: 0.3 },
        { value: 'wheelchair', label: 'Wheelchair Accessible', threshold: 0.7 },
        { value: 'visual', label: 'Visual Impairment Friendly', threshold: 0.6 },
        { value: 'mobility', label: 'Mobility Aid Friendly', threshold: 0.65 },
    ];

    const currentFilterLabel = filterOptions.find(f => f.value === currentFilter)?.label || 'All Routes';

    return (
        <div className="header">
            <div className="header-search-group">
                {/* Start Location Search */}
                <div className="header-search header-search-start" ref={startRef}>
                    <Navigation size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', zIndex: 1 }} />
                    <input
                        type="text"
                        className="input"
                        placeholder="Start location..."
                        value={startQuery}
                        onChange={(e) => setStartQuery(e.target.value)}
                        onFocus={() => startResults.length > 0 && setShowStartResults(true)}
                        style={{ flex: 1, paddingLeft: '36px' }}
                    />
                    {startQuery && (
                        <button
                            onClick={() => {
                                setStartQuery("");
                                setShowStartResults(false);
                            }}
                            className="search-clear-btn"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {isSearchingStart && (
                        <Loader2 size={16} className="search-loader" />
                    )}

                    {showStartResults && startResults.length > 0 && (
                        <div className="search-results">
                            {startResults.map((result, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleStartResultClick(result)}
                                    className="search-result-item"
                                >
                                    <div className="search-result-name">
                                        {result.name || result.display_name?.split(',')[0]}
                                    </div>
                                    <div className="search-result-address">
                                        {result.display_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Destination Search */}
                <div className="header-search header-search-destination" ref={destinationRef}>
                    <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', zIndex: 1 }} />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search destination..."
                        value={destinationQuery}
                        onChange={(e) => setDestinationQuery(e.target.value)}
                        onFocus={() => destinationResults.length > 0 && setShowDestinationResults(true)}
                        style={{ flex: 1, paddingLeft: '36px' }}
                    />
                    {destinationQuery && (
                        <button
                            onClick={() => {
                                setDestinationQuery("");
                                setShowDestinationResults(false);
                            }}
                            className="search-clear-btn"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {isSearchingDestination && (
                        <Loader2 size={16} className="search-loader" />
                    )}

                    {showDestinationResults && destinationResults.length > 0 && (
                        <div className="search-results">
                            {destinationResults.map((result, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleDestinationResultClick(result)}
                                    className="search-result-item"
                                >
                                    <div className="search-result-name">
                                        {result.name || result.display_name?.split(',')[0]}
                                    </div>
                                    <div className="search-result-address">
                                        {result.display_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="header-context">
                <button
                    className="btn-outline btn"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    onClick={handleCurrentLocation}
                    disabled={isGettingLocation}
                >
                    {isGettingLocation ? (
                        <>
                            <Loader2 size={14} style={{ marginRight: '4px', animation: 'spin 1s linear infinite' }} />
                            Getting Location...
                        </>
                    ) : (
                        <>
                            <MapPin size={14} style={{ marginRight: '4px' }} />
                            Use Current Location
                        </>
                    )}
                </button>
            </div>

            <div className="header-actions">
                <div className="filter-dropdown" ref={filterRef}>
                    <button
                        className="icon-btn filter-btn"
                        title="Accessibility Filter"
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                    >
                        <Filter size={18} />
                        <span className="filter-label">{currentFilterLabel}</span>
                    </button>
                    {showFilterMenu && (
                        <div className="filter-menu">
                            {filterOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`filter-option ${currentFilter === option.value ? 'active' : ''}`}
                                    onClick={() => {
                                        onFilterChange?.(option.value, option.threshold);
                                        setShowFilterMenu(false);
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button className="icon-btn" title="Profile">
                    <User size={18} />
                </button>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default Header;
