import { Plus } from "lucide-react";

function FloatingActionButton({ onClick }) {
    return (
        <button className="fab" onClick={onClick}>
            <Plus size={20} />
            Review
        </button>
    );
}

export default FloatingActionButton;
