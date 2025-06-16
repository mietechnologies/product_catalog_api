const Miniature = require('../models/Miniature');
const categoryAbbreviations = require('../configs/miniCategoryAbbreviations');

exports.generateMiniatureProductCode = function(category, index) {
    const categoryCode = categoryAbbreviations[category];

    if (!categoryCode) {
        throw new Error(`Invalid category: ${category}`);
    }

    const number = String(index).padStart(4, '0');

    return `M-${categoryCode}-${number}`;
}

exports.getVariantCountForCategory = async function(category) {
    const miniatures = await Miniature.find({ category }, { variants: 1 })
        
    return miniatures.reduce((count, mini) => count + (mini.variants.length || 0), 0);
}