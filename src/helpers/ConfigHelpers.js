class ConfigHelpers {
    static getPositionalValue(from, preIs0_midIs1_postIs2) { // для обробки можливості мати тріаду префікс-мід-пост
        if (preIs0_midIs1_postIs2 == null) {
            preIs0_midIs1_postIs2 = 1; // default is mid
        }

        return Array.isArray(from)
            ? (from.length > preIs0_midIs1_postIs2
                ? from[preIs0_midIs1_postIs2]
                : from[from.length - 1])
            : from;
    }
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = ConfigHelpers;
} else {
    // browser:
    window.ConfigHelpers = ConfigHelpers;
}