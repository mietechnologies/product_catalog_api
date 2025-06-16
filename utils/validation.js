exports.safeNumber = function(value, defaultValue = 0) {
    return Number.isFinite(value) ? value : defaultValue;
}