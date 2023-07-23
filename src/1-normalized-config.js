const Hlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./0-string-value-or-array-helpers')
    : /* browser */ StringValueOrArrayHelpers;

// A wrapper over a raw config
class NormalizedConfig {
    // todo: think how to make private:
    static AFFECTING = 'affecting';
    static AFFECTED = 'affected';

    #config = null; // todo: rename to wrappee?

    #cache = {};

    constructor(rawConfig) {
        this.#config = {...rawConfig};
        this.#ensureNormalized();
    }

    get #configCopy() {
        return {...this.#config};
    }

    // TODO: think what to leave private:
    // TODO: make unmutual using configCopy?
    // TODO: use Proxy - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    get code() {
        return this.#config.code;
    }

    get name() {
        return this.#config.name;
    }

    get desc() {
        return this.#config.desc;
    }

    get link() {
        return this.#config.link;
    }

    get from() {
        return this.#config.from;
    }

    get to() {
        return this.#config.to;
    }

    get year() {
        return this.#config.year;
    }

    get useLocationInWordAlgo() {
        return this.#config.useLocationInWordAlgo;
    }

    get affectVowelNotConsonantWhenSofting() {
        return this.#config.affectVowelNotConsonantWhenSofting;
    }

    get dict() {
        return this.#config.dict;
    }

    get otherLanguagesLettersDict() {
        return this.#config.otherLanguagesLettersDict;
    }

    get unsoftableConsonants() {
        return this.#config.unsoftableConsonants;
    }

    get softableConsonantsDict() {
        return this.#config.softableConsonantsDict;
    }

    get softingVowelsMultiDict() {
        return this.#config.softingVowelsMultiDict;
    }

    get softingSignsMultiDict() {
        return this.#config.softingSignsMultiDict;
    }

    get apostrophesSingleKeyDict() {
        return this.#config.apostrophesSingleKeyDict;
    }

    get exceptionalCaseRules() {
        return this.#config.exceptionalCaseRules;
    }

    get specSymbolsDict() {
        return this.#config.specSymbolsDict;
    }

    get substitutionForErrors() {
        return this.#config.substitutionForErrors;
    }

    get beforeStartDict() {
        return this.#config.beforeStartDict;
    }

    get afterFinishDict() {
        return this.#config.afterFinishDict;
    }

    getProperty(propName) {
        if (!this.#config.hasOwnProperty(propName)) {
            return undefined;
        }
        return this.#configCopy[propName];
    }

    get isEmpty() {
        return this.#config != null;
    }

    get isNormalized() {
        return this.#config.isNormalized;
    }

    /**
     * Returns unique sorted letters of the config's source alphabet.
     * @param {boolean} getOnlyLower - Whether to return only lowercase letters.
     * @param {boolean} includeOtherLangLetters - Whether to include letters from other languages.
     * @returns {string[]} An array of unique sorted letters.
     */
    getSourceAlphabet(getOnlyLower, includeOtherLangLetters) {
        const cacheKey = includeOtherLangLetters ? 'withOtherLangLetters' : 'withoutOtherLangLetters';

        if (!this.#cache[cacheKey]) {
            this.#cache[cacheKey] = this.#doGetSourceAlphabet(includeOtherLangLetters);
        }

        const alphabet = this.#cache[cacheKey];
        return getOnlyLower ? this.#makeLowerAlphabet(alphabet) : alphabet;
    }

    #doGetSourceAlphabet(includeOtherLangLetters) {
        const cfg = this.#config;

        const letterHeap = [
            cfg.unsoftableConsonants,
            ...Object.keys(cfg.softingSignsMultiDict),
            ...Object.keys(cfg.dict),
            ...Object.keys(cfg.softableConsonantsDict),
            ...Object.keys(cfg.softingVowelsMultiDict),
            ...Object.keys(cfg.beforeStartDict),
            ...(includeOtherLangLetters ? Object.keys(cfg.otherLanguagesLettersDict) : [])
        ];

        const letters = letterHeap.flatMap(el => [...el]);

        const uniqueLetters = [...new Set(letters)];
        return uniqueLetters
            .filter(v => !includeOtherLangLetters // get rid of other languages' letters (if needed)
                ? !cfg.otherLanguagesLettersDict.hasOwnProperty(v)
                : true)
            .sort(NormalizedConfig.alphabetOrderComparator);
    }

    #makeLowerAlphabet(array) {
        const lowerAlphabet = array.map(c => c.toLowerCase());
        return [...new Set(lowerAlphabet)]; // make unique
    }

    // TODO: would be nice to make it private when it's possible:
    // TODO: PROFILER: often used
    /**
     * A custom comparator for sorting letters in a specific order.
     * Certain characters are given higher priority than others.
     * @param a The first letter to compare.
     * @param b The second letter to compare.
     * @return A negative integer, zero, or a positive integer as the first argument is less than, equal to, or greater than the second.
     */
    static alphabetOrderComparator(a, b) {
        const shouldBeLast = '\'’*';
        let signChanger = shouldBeLast.includes(a) !== shouldBeLast.includes(b) ? -1 : 1;

        const specialGroupOrders = [
            'AaȦȧÄä',
            'EeĖėËë',
            'IıİiÏï',
            'OoȮȯÖö',
            'UuU̇u̇Üü',
            'YyẎẏŸÿ'
        ];

        for (const group of specialGroupOrders) {
            const aInGroup = group.includes(a);
            const bInGroup = group.includes(b);

            if (aInGroup || bInGroup) {
                if (aInGroup && bInGroup) {
                    return group.indexOf(a).toString()
                        .localeCompare(group.indexOf(b).toString());
                } else {
                    if (aInGroup) {
                        a = group[0];
                    }

                    if (bInGroup) {
                        b = group[0];
                    }
                    break;
                }
            }
        }

        return signChanger * a.localeCompare(b, 'uk', {caseFirst: 'upper'});
    }

    // TODO /* test, rethink collections */  // TODO прочистити від шлаку
    // TODO: тут чи повернути в транслітератор?
    // TODO: PROFILER: heavy usage: 38 ticks
    getDigraphs() {
        const cfg = this.#config;
        const dontUseDiacritics = false; // !this.#useDiacritics todo: get rid of #useDiacritics!

        let letterHeap = [];
        const dictsToGetFrom = [
            cfg.beforeStartDict,
            cfg.dict,
            cfg.apostrophesSingleKeyDict,
            cfg.softableConsonantsDict,
            cfg.softingVowelsMultiDict,
            cfg.softingSignsMultiDict,
            cfg.otherLanguagesLettersDict,
            cfg.afterFinishDict
        ];
        for (const dict of dictsToGetFrom) {
            letterHeap = letterHeap.concat(Hlprs.flatValuesAt(dict, dontUseDiacritics));
        }

        const digraphs = [];
        for (const el of letterHeap) {
            if (el == null) { // it shouldn't happen
                continue;
            }

            if (el.length > 1) {
                digraphs.push(el.toLowerCase());
            }
        }

        return digraphs.filter((v, i, s) => s.indexOf(v) === i);  // get unique
    }

    #ensureNormalized() {
        const cfg = this.#config;
        const useDiacritics = true; // this.#useDiacritics todo: get rid of #useDiacritics!

        if (cfg.isNormalized) {
            return;
        }

        cfg.code = cfg.code ?? 'code' + Math.floor(Math.random() * 1000); // TODO: use hash instead of random!!!!!
        cfg.name = cfg.name ?? 'Unnamed';
        cfg.desc = cfg.desc ?? '';
        cfg.link = cfg.link ?? '';
        cfg.from = cfg.from ?? '';
        cfg.to = cfg.to ?? '';
        cfg.exceptionalCaseRules = cfg.exceptionalCaseRules ?? {};
        ///cfg.year = cfg.year ?? -1;
        ////cfg.substitutionForErrors = cfg.substitutionForErrors ?? '';

        cfg.affectVowelNotConsonantWhenSofting =
            cfg.affectVowelNotConsonantWhenSofting ?? false;
        cfg.useLocationInWordAlgo = cfg.useLocationInWordAlgo ?? false;

        // arrs:
        cfg.unsoftableConsonants = cfg.unsoftableConsonants ?? [];
        // dicts:
        cfg.softableConsonantsDict = NormalizedConfig.#getNormalizedDictStructure(cfg.softableConsonantsDict);
        cfg.dict = NormalizedConfig.#getNormalizedDictStructure(cfg.dict);
        cfg.otherLanguagesLettersDict = NormalizedConfig.#getNormalizedDictStructure(cfg.otherLanguagesLettersDict);
        cfg.specSymbolsDict = NormalizedConfig.#getNormalizedDictStructure(cfg.specSymbolsDict);
        cfg.beforeStartDict = NormalizedConfig.#getNormalizedDictStructure(cfg.beforeStartDict);
        cfg.afterFinishDict = NormalizedConfig.#getNormalizedDictStructure(cfg.afterFinishDict);
        // multidicts:
        cfg.softingSignsMultiDict = NormalizedConfig.#getNormalizedMultiDictStructure(cfg.softingSignsMultiDict);
        cfg.softingVowelsMultiDict = NormalizedConfig.#getNormalizedMultiDictStructure(cfg.softingVowelsMultiDict);
        // single key dicts:
        this.#normalizeApostrophesSingleKeyDict();

        // beforeStartDict uses it's own rules:
        NormalizedConfig.#completeByUpperAndTitleCased(cfg.beforeStartDict);
        if (!useDiacritics) {
            NormalizedConfig.#completeByNonDiacritics(cfg.beforeStartDict, true);
        }

        const cols = [
            // arrs:
            cfg.unsoftableConsonants,

            // dicts/multidicts:
            cfg.softableConsonantsDict,
            cfg.dict,
            cfg.otherLanguagesLettersDict,
            cfg.softingSignsMultiDict,
            cfg.softingVowelsMultiDict,
            ////cfg.specSymbolsDict,
            ////cfg.beforeStartDict,
            cfg.afterFinishDict
        ];

        for (const col of cols) {
            NormalizedConfig.#completeByUpperAndTitleCased(col);

            if (!useDiacritics) {
                NormalizedConfig.#completeByNonDiacritics(col);
            }
        }

        cfg.isNormalized = true;
    }

    #normalizeApostrophesSingleKeyDict() {
        const cfg = this.#config;
        let keys;
        if (cfg.apostrophesSingleKeyDict != null) {
            keys = Object.keys(cfg.apostrophesSingleKeyDict);
        }

        if (keys == null || !keys.length) {
            cfg.apostrophesSingleKeyDict = {"": ""};
        } else {
            let i = 0;
            // ensure dict has a single key:
            keys.forEach((key) =>
                i++ === 0 || delete cfg.apostrophesSingleKeyDict[key]);
        }
    }

    // Makes dict structure normalized to common rules. E.g. "а": "a" becomes "а": [ "a" ]
    // (because each dict value should be array of [0] = diacritic and (optionally) [1] = non-diacritic value) 
    static #getNormalizedDictStructure(dict) {
        const res = {};

        if (dict == null) {
            return res;
        }

        // TODO: refactor using const (key, value):
        for (const key of Object.keys(dict)) {
            const isValue = !Array.isArray(dict[key]);
            const isEmptyArray = Array.isArray(dict[key]) && dict[key].length === 0;
            const isArrayWith3Elems = Array.isArray(dict[key]) && dict[key].length === 3;

            if (isValue || isArrayWith3Elems) {
                res[key] = [dict[key]]; // value or pre-mid-post placing array was set in short diacritic-only form
                continue;
            }

            if (isEmptyArray) {
                res[key] = [""]; // should not happen
                continue;
            }

            res[key] = dict[key];  // Already OK. E.g., "а": [ "a" ] or "я": [ "à", "ya" ]
        }

        return res;
    }

    static #getNormalizedMultiDictStructure(multiDict) {
        const res = {};

        if (multiDict == null) {
            return res;
        }

        // TODO: use [key, value]
        for (const key of Object.keys(multiDict)) {
            if (multiDict[key].constructor !== Object) {
                const valOrArr = multiDict[key];
                const affectionDict = {};
                affectionDict[NormalizedConfig.AFFECTED] = valOrArr;
                affectionDict[NormalizedConfig.AFFECTING] = valOrArr;

                res[key] = NormalizedConfig.#getNormalizedDictStructure(affectionDict);
            } else {
                res[key] = NormalizedConfig.#getNormalizedDictStructure(multiDict[key]);
            }
        }

        return res;
    }

    /// If the second (non-diacritics) value/array in the dictOfArrs
    /// hasn't been set – let's copy it without diacritics.
    static #completeByNonDiacritics(/*[ref]*/dictOfArrsOrMulti, doNotForce) { // TODO: use last arg level upper
        if (dictOfArrsOrMulti.constructor !== Object) {
            return;
        }

        for (const arrOrAffectionDict of Object.values(dictOfArrsOrMulti)) {
            if (arrOrAffectionDict.constructor === Object) {
                // affection dict, use recursive call:
                NormalizedConfig.#completeByNonDiacritics(arrOrAffectionDict);
                continue;
            }

            if (!arrOrAffectionDict.length) {
                continue; // it shouldn't happen
            }

            if (arrOrAffectionDict.length === 1) {
                // Copy second one from the first one:
                arrOrAffectionDict.push(Hlprs.toDiacriticless(arrOrAffectionDict[0]));
            } else if (!doNotForce) { // arr.length > 1 and forced mode
                arrOrAffectionDict[1] = Hlprs.toDiacriticless(arrOrAffectionDict[1]); // forced mode: ensure given second value doesn't have diacritics
            } else {
                // do nothing;
            }
        }
    }

    static #completeByUpperAndTitleCased(/*[ref]*/arrOrDictOrMulti) {
        const toCaseFuncs = [
            Hlprs.toTitleCase,
            Hlprs.toUpperCase
        ];
        // TODO: append func for 3 letters case (or probably each of possible combinations)

        if (Array.isArray(arrOrDictOrMulti)) {
            const toConcat = [];

            for (const item of arrOrDictOrMulti) {
                for (const toCaseFunc of toCaseFuncs) {
                    const toPush = toCaseFunc(item);
                    if (!arrOrDictOrMulti.includes(toPush) && !toConcat.includes(toPush)) {
                        toConcat.push(toPush);
                    }
                }
            }

            toConcat.forEach(val => arrOrDictOrMulti.push(val)); // instead of: arrOrDict = arrOrDict.concat(toConcat);
        } else { // dictionary or multi-dictionary:
            for (const [lowerKey, lowerArrOrAffectionDict] of Object.entries(arrOrDictOrMulti)) {
                for (const toCaseFunc of toCaseFuncs) {
                    const casedKey = toCaseFunc(lowerKey);
                    if (arrOrDictOrMulti.hasOwnProperty(casedKey)) {
                        continue;
                    }

                    if (Array.isArray(lowerArrOrAffectionDict)) {
                        const casedArr = [];
                        for (const valOrArr of lowerArrOrAffectionDict) {
                            casedArr.push(toCaseFunc(valOrArr));
                        }

                        arrOrDictOrMulti[casedKey] = casedArr;
                        continue;
                    }

                    const casedAffectionDict = {};

                    for (const [affectionKey, affectionLowerArr] of Object.entries(lowerArrOrAffectionDict)) {
                        const casedArr = [];
                        for (const valOrArr of affectionLowerArr) {
                            casedArr.push(toCaseFunc(valOrArr));
                        }
                        casedAffectionDict[affectionKey] = casedArr;
                    }

                    arrOrDictOrMulti[casedKey] = casedAffectionDict;
                }
            }
        }
    }
}

// If it's Node.js:
if (typeof window === 'undefined') {
    module.exports = NormalizedConfig;
}