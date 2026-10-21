exports.safeNumber = function(value, defaultValue = 0) {
    return Number.isFinite(value) ? value : defaultValue;
}

// Normalizes an optional attribution payload ({ creator, modelUrl }).
// Returns undefined when not provided, null when it should be cleared,
// or an object with trimmed, non-empty fields. Throws a string message on invalid input.
exports.parseAttribution = function(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw 'attribution must be an object with optional creator and modelUrl strings';
    }

    const result = {};
    for (const field of ['creator', 'modelUrl']) {
        const raw = value[field];
        if (raw === undefined || raw === null) continue;
        if (typeof raw !== 'string') throw `attribution.${field} must be a string`;
        const trimmed = raw.trim();
        if (trimmed) result[field] = trimmed;
    }

    if (result.modelUrl && !/^https?:\/\/\S+$/i.test(result.modelUrl)) {
        throw 'attribution.modelUrl must be a valid http(s) URL';
    }

    return Object.keys(result).length > 0 ? result : null;
}
