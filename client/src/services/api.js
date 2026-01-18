const DEFAULT_API_BASE = "http://localhost:3001/api";

function getApiBase() {
    const raw = import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE;
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function request(path, { method = "GET", params, body } = {}) {
    const base = getApiBase();
    const url = new URL(`${base}${path}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            url.searchParams.set(key, String(value));
        });
    }

    const fetchOptions = {
        method,
        headers: {
            Accept: "application/json",
        },
    };

    if (body !== undefined) {
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    let payload = null;
    const text = await response.text();
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            throw new Error("Received malformed response from the server.");
        }
    }

    if (!response.ok) {
        const message =
            payload?.error ||
            payload?.message ||
            `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return payload;
}

export async function searchPlaces(query, { limit = 6 } = {}) {
    if (!query) return [];
    const data = await request("/map/search", {
        method: "GET",
        params: { query, limit },
    });
    return data?.results ?? [];
}

export async function reverseGeocode(lat, lon) {
    const data = await request("/map/reverse", {
        method: "GET",
        params: { lat, lon },
    });
    return data?.result ?? null;
}

export async function planWalkingRoute({ start, end, options = {} }) {
    const response = await request("/routes/walking", {
        method: "POST",
        body: { start, end, options },
    });
    // Return the route object directly, let App.jsx handle the success check
    return response.route || { success: false, error: 'invalid_response' };
}
