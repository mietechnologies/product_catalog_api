const miniCategoryAbbreviations = require('./miniCategoryAbbreviations');
const printCategoryAbbreviations = require('./printCategoryAbbreviations');
const miniSizes = require('./miniSizes');

// Each product type owns its product code prefix and its category → 2-letter code map.
// Product codes follow `{codePrefix}-{XX}-{NNNN}`, e.g. M-DR-0001 or P-TY-0001.
module.exports = {
    miniature: {
        label: 'Miniatures',
        codePrefix: 'M',
        categories: miniCategoryAbbreviations,
        sizes: miniSizes,
        hasVariants: true
    },
    print: {
        label: 'Prints',
        codePrefix: 'P',
        categories: printCategoryAbbreviations,
        hasVariants: false
    }
}
