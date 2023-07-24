class StringValueOrArrayHelpers {
    /// E.g. "abc" will become "Abc", "...xyz" will become "...Xyz"
    static toTitleCase(valOrArr) {
        if (valOrArr == null) {
            return null;
        }

        // recursive calls for each array's element:
        if (Array.isArray(valOrArr)) {
            const titleCasedArr = [...valOrArr];

            for (let i = 0; i < titleCasedArr.length; ++i) {
                titleCasedArr[i] = StringValueOrArrayHelpers.toTitleCase(titleCasedArr[i]);
            }

            return titleCasedArr;
        }

        const isNonCased = c => c != null
            ? c.toLowerCase() === c.toUpperCase()
            : true;

        // the arg is a string value:
        for (let i = 0; i < valOrArr.length; ++i) {
            if (isNonCased(valOrArr.charAt(i))) {
                continue; // until first 'uppercasable' char
            }

            return valOrArr.slice(0, i + 1).toUpperCase() + valOrArr.slice(i + 1);
        }
        return valOrArr;
    }

    /// E.g. "abc" will become "ABC", "...xyz" will become "...XYZ"
    /// exceptionalCaseRules is a dictionary for special lower-upper pairs
    static toUpperCase(valOrArr, exceptionalCaseRules) {
        if (valOrArr == null) {
            return null;
        }

        // recursive calls for each array's element:
        if (Array.isArray(valOrArr)) {
            const upperCasedArr = [...valOrArr];

            for (let i = 0; i < upperCasedArr.length; ++i) {
                upperCasedArr[i] = StringValueOrArrayHelpers.toUpperCase(upperCasedArr[i]);
            }

            return upperCasedArr;
        }

        // the arg is a string value:
        let res = valOrArr;
        const entries = Object.entries(exceptionalCaseRules ?? {})
        for (const [lower, upper] of entries) {
            res = res.replaceAll(lower, upper);
        }
        return res.toUpperCase();
    }

    static toDiacriticless(valOrArr) {
        if (valOrArr == null) {
            return null;
        }

        // recursive calls for each array's element:
        if (Array.isArray(valOrArr)) {
            const diacriticlessArr = [...valOrArr];

            for (let i = 0; i < diacriticlessArr.length; ++i) {
                diacriticlessArr[i] = StringValueOrArrayHelpers.toDiacriticless(diacriticlessArr[i]);
            }

            return diacriticlessArr;
        }

        // the arg is a string value:

        const someSpecialCases = {
            "ł": "l", "Ł": "L",
            "ı": "i", "İ": "I"
        };

        return someSpecialCases[valOrArr] != null
            ? someSpecialCases[valOrArr]
            : valOrArr.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    }


    /**
     * Flattens the values in a given object. If the values are objects, it calls the function recursively.
     *
     * @param {Object} obj - Object to flatten the values from.
     * @returns {Array} - Array of flattened values.
     */
    static flattenValues(obj) {
        return Object.values(obj).flatMap(val =>
            typeof val === 'object' && !Array.isArray(val)
                ? this.flattenValues(val)
                : val);
    }
}

// If it's Node.js:
if (typeof window === 'undefined') {
    module.exports = StringValueOrArrayHelpers;
}