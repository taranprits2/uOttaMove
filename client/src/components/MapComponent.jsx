import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

// Custom marker icons
const startIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="marker-start"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="marker-end"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

function MapEvents({ onMapClick }) {
    const map = useMap();
    useEffect(() => {
        const handleClick = (e) => {
            onMapClick(e.latlng);
        };
        map.on("click", handleClick);
        return () => {
            map.off("click", handleClick);
        };
    }, [map, onMapClick]);
    return null;
}

// Component to auto-fit bounds when route changes
function FitBounds({ route }) {
    const map = useMap();

    useEffect(() => {
        if (route && route.polyline && route.polyline.length > 0) {
            const bounds = L.latLngBounds(route.polyline.map(([lat, lon]) => [lat, lon]));
            map.flyToBounds(bounds, {
                padding: [50, 50],
                maxZoom: 16,
                duration: 0.8,
                easeLinearity: 0.25
            });
        }
    }, [route, map]);

    return null;
}

// Draggable marker component
function DraggableMarker({ position, icon, onDragEnd }) {
    const markerRef = useRef(null);

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                const newPos = marker.getLatLng();
                onDragEnd({ lat: newPos.lat, lng: newPos.lng });
            }
        },
    };

    return (
        <Marker
            position={[position.lat, position.lng]}
            icon={icon}
            draggable={true}
            eventHandlers={eventHandlers}
            ref={markerRef}
        />
    );
}

function MapComponent({ start, end, route, onMapClick, onStartDrag, onEndDrag }) {
    const center = [45.4215, -75.6972]; // Ottawa center

    return (
        <MapContainer
            center={center}
            zoom={13}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
            zoomAnimation={true}
            fadeAnimation={true}
            markerZoomAnimation={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />
            <MapEvents onMapClick={onMapClick} />
            <FitBounds route={route} />

            {start && (
                <DraggableMarker
                    position={start}
                    icon={startIcon}
                    onDragEnd={onStartDrag}
                />
            )}

            {end && (
                <DraggableMarker
                    position={end}
                    icon={endIcon}
                    onDragEnd={onEndDrag}
                />
            )}

            {route && route.segments && route.segments.map((segment, idx) => {
                const score = segment.score ?? 0.5;
                let color = "#ef4444"; // Default Red
                if (score > 0.8) color = "#22c55e"; // Green
                else if (score > 0.6) color = "#84cc16"; // Lime
                else if (score > 0.45) color = "#f59e0b"; // Amber

                return (
                    <Polyline
                        key={`seg-${idx}`}
                        positions={segment.path.map(([lat, lon]) => [lat, lon])}
                        pathOptions={{ color, weight: 6, opacity: 0.9 }}
                    >
                    </Polyline>
                );
            })}

            {!route?.segments && route?.polyline && (
                <Polyline
                    positions={route.polyline.map(([lat, lon]) => [lat, lon])}
                    pathOptions={{ color: "#2B59C3", weight: 6, opacity: 0.8 }}
                />
            )}
        </MapContainer>
    );
}

export default MapComponent;
