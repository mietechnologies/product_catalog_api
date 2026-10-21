// Fields shared by every sellable unit: a miniature variant, or a print product itself.
// Returns a fresh definition each call so schemas never share path objects.
module.exports = function sellableFields() {
    return {
        productCode: { type: String, required: true },
        fileName: { type: String, required: true },
        images: { type: Map, of: String, default: () => new Map() },
        thumbnail: { type: String },
        price: {
            cost: { type: Number },
            wholesale: { type: Number },
            msrp: { type: Number }
        }
    };
}
