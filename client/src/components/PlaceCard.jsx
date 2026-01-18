import { Star } from "lucide-react";

function PlaceCard({ title, rating, description, accessibilityTags = [], isNew = false, onClick }) {
    return (
        <div className="place-card" onClick={onClick}>
            <div className="place-card-header">
                <div className="place-card-title">{title}</div>
                {rating && (
                    <div className="place-card-rating">
                        <Star size={14} fill="currentColor" />
                        {rating}
                    </div>
                )}
            </div>

            {description && (
                <div className="place-card-description">{description}</div>
            )}

            <div className="place-card-tags">
                {accessibilityTags.map((tag, idx) => (
                    <span key={idx} className="pill pill-success">
                        {tag}
                    </span>
                ))}
                {isNew && <span className="badge-new">New listing</span>}
            </div>
        </div>
    );
}

export default PlaceCard;
