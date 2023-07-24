const Hlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StringValueOrArrayHelpers')
    : /* browser */ StringValueOrArrayHelpers;

// A wrapper over a raw json config
// TODO: expose outside unordered maps and sets, not objects and arrays
class TransliterationConfig {
    static #AFFECTING = 'affecting';
    static #AFFECTED = 'affected';

    static get AFFECTING() { // get-only for outside
        return this.#AFFECTING;
    }

    static get AFFECTED() { // get-only for outside
        return this.#AFFECTED;
    }

    static #UNSUPPORTED_NON_DIACRITIC_VALUES_MSG = "Previously supported non-diacritic values are deprecated";

    #wrappedConfig = null; // rename to wrappedConfigMap?
    #cache = {};

    constructor(rawConfig) {
        this.#wrappedConfig = {...rawConfig};
        this.#ensureNormalized();
    }

    get #configCopy() {
        return {...this.#wrappedConfig};
    }

    // TODO: think what to leave private:
    // TODO: make not mutual by using configCopy?
    // TODO: use Proxy - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    get code() {
        return this.#wrappedConfig.code;
    }

    get name() {
        return this.#wrappedConfig.name;
    }

    get desc() {
        return this.#wrappedConfig.desc;
    }

    get link() {
        return this.#wrappedConfig.link;
    }

    /**
     * Returns the language code of the config's source language.
     * @returns {string}
     */
    get from() {
        return this.#wrappedConfig.from;
    }

    /**
     * Returns the language code of the config's target language.
     * @returns {string}
     */
    get to() {
        return this.#wrappedConfig.to;
    }

    get year() {
        return this.#wrappedConfig.year;
    }

    get useLocationInWordAlgo() {
        return this.#wrappedConfig.useLocationInWordAlgo;
    }

    get affectVowelNotConsonantWhenSofting() {
        return this.#wrappedConfig.affectVowelNotConsonantWhenSofting;
    }

    get dict() {
        return this.#wrappedConfig.dict;
    }

    get otherLanguagesLettersDict() {
        return this.#wrappedConfig.otherLanguagesLettersDict;
    }

    get unsoftableConsonants() {
        return this.#wrappedConfig.unsoftableConsonants;
    }

    get softableConsonantsDict() {
        return this.#wrappedConfig.softableConsonantsDict;
    }

    get softingVowelsMultiDict() {
        return this.#wrappedConfig.softingVowelsMultiDict;
    }

    get softingSignsMultiDict() {
        return this.#wrappedConfig.softingSignsMultiDict;
    }

    get apostrophesSingleKeyDict() {
        return this.#wrappedConfig.apostrophesSingleKeyDict;
    }

    get exceptionalCaseRules() {
        return this.#wrappedConfig.exceptionalCaseRules;
    }

    get specSymbolsDict() {
        return this.#wrappedConfig.specSymbolsDict;
    }

    get substitutionForErrors() {
        return this.#wrappedConfig.substitutionForErrors;
    }

    get beforeStartDict() {
        return this.#wrappedConfig.beforeStartDict;
    }

    get afterFinishDict() {
        return this.#wrappedConfig.afterFinishDict;
    }

    getProperty(propName) {
        if (!this.#wrappedConfig.hasOwnProperty(propName)) {
            return undefined;
        }
        return this.#configCopy[propName];
    }

    get isEmpty() {
        return this.#wrappedConfig != null;
    }

    get isNormalized() {
        return this.#wrappedConfig.isNormalized;
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

    /**
     * Collects the source alphabet for the language, removing duplicates and sorting in alphabetical order.
     * Other languages' letters can be included or excluded based on the function argument.
     */
    #doGetSourceAlphabet(includeOtherLangLetters) {
        const cfg = this.#wrappedConfig;

        const letterHeap = [
            cfg.unsoftableConsonants,
            ...Object.keys(cfg.softingSignsMultiDict),
            ...Object.keys(cfg.dict),
            ...Object.keys(cfg.softableConsonantsDict),
            ...Object.keys(cfg.softingVowelsMultiDict),
            ...Object.keys(cfg.beforeStartDict),
            ...(includeOtherLangLetters ? Object.keys(cfg.otherLanguagesLettersDict) : [])
        ];

        const uniqueLetters = [...new Set(letterHeap.flat())];

        // Filter out other languages' letters if not needed and sort the remaining letters.
        return uniqueLetters
            .filter(letter => includeOtherLangLetters || !cfg.otherLanguagesLettersDict.hasOwnProperty(letter))
            .sort(TransliterationConfig.alphabetOrderComparator);
    }

    #makeLowerAlphabet(array) {
        const lowerAlphabet = array.map(c => c.toLowerCase());
        return [...new Set(lowerAlphabet)]; // make unique
    }

    // TODO: would be nice to make it private when it's possible:
    /**
     * A custom comparator for sorting letters in a specific order.
     * Certain characters are given higher priority than others.
     * @param a The first letter to compare.
     * @param b The second letter to compare.
     * @return A negative integer, zero, or a positive integer as the first argument is less than, equal to, or greater than the second.
     */
    static alphabetOrderComparator(a, b) {
        const shouldBeLast = new Set(["'", '’', '*']);
        let signChanger = shouldBeLast.has(a) !== shouldBeLast.has(b) ? -1 : 1;

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
                    return group.indexOf(a) - group.indexOf(b);
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

    /**
     * Returns an array of unique digraphs (specified letter combinations) from various dictionaries in config.
     * @returns {string[]} An array of unique digraphs.
     */
    getDigraphs() {
        // TODO: do caching as in getSourceAlphabet()
        const cfg = this.#wrappedConfig;
        //const dontUseDiacritics = false; // !this.#useDiacritics todo: get rid of #useDiacritics!

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

        const letterHeap = dictsToGetFrom.flatMap(dict => Hlprs.flattenValues(dict/*, dontUseDiacritics*/));

        const digraphs = letterHeap
            .filter(el => el && el.length > 1)
            .map(el => el.toLowerCase());

        return [...new Set(digraphs)]; // get unique
    }


    /**
     * Ensures the config is normalized according to specific rules.
     * This involves assigning default values to the config's properties if they have not been initialized.
     * Furthermore, it adjusts case inconsistencies in certain collections by adding their upper and title cased versions.
     * Once all transformations are complete, the `isNormalized` property of the config is set to true.
     */
    #ensureNormalized() {
        const cfg = this.#wrappedConfig;

        if (cfg.isNormalized) {
            return;
        }

        cfg.code = cfg.code ?? 'code' + Math.floor(Math.random() * 1000); // TODO: use hash instead of random?
        cfg.name = cfg.name ?? 'Unnamed';
        cfg.desc = cfg.desc ?? '';
        cfg.link = cfg.link ?? '';
        cfg.from = cfg.from ?? '';
        cfg.to = cfg.to ?? '';
        cfg.exceptionalCaseRules = cfg.exceptionalCaseRules ?? {};
        ///cfg.year = cfg.year ?? -1;
        ////cfg.substitutionForErrors = cfg.substitutionForErrors ?? '';

        cfg.affectVowelNotConsonantWhenSofting = cfg.affectVowelNotConsonantWhenSofting ?? false;
        cfg.useLocationInWordAlgo = cfg.useLocationInWordAlgo ?? false;

        // arrs:
        cfg.unsoftableConsonants = cfg.unsoftableConsonants ?? [];

        // dicts:
        const normalizeDict = TransliterationConfig.#getNormalizedDictStructure;
        cfg.softableConsonantsDict = normalizeDict(cfg.softableConsonantsDict);
        cfg.dict = normalizeDict(cfg.dict);
        cfg.otherLanguagesLettersDict = normalizeDict(cfg.otherLanguagesLettersDict);
        cfg.specSymbolsDict = normalizeDict(cfg.specSymbolsDict);
        cfg.beforeStartDict = normalizeDict(cfg.beforeStartDict);
        cfg.afterFinishDict = normalizeDict(cfg.afterFinishDict);

        // multi-dictionaries:
        const normalizeMultiDict = TransliterationConfig.#getNormalizedMultiDictStructure;
        cfg.softingSignsMultiDict = normalizeMultiDict(cfg.softingSignsMultiDict);
        cfg.softingVowelsMultiDict = normalizeMultiDict(cfg.softingVowelsMultiDict);

        // single key dicts:
        this.#normalizeApostrophesSingleKeyDict();

        // beforeStartDict uses its own rules:
        TransliterationConfig.#completeByUpperAndTitleCased(cfg.beforeStartDict);

        // Complete upper and title cases for the following collections:
        const collections = [
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

        for (const collection of collections) {
            TransliterationConfig.#completeByUpperAndTitleCased(collection);
        }

        cfg.isNormalized = true;
    }

    /**
     * Ensures that the `apostrophesSingleKeyDict` property of the config has only one key.
     * If the dictionary is null or has no keys, it is initialized with an empty string key/value pair.
     * If there are multiple keys, it keeps the first one and removes the rest.
     */
    #normalizeApostrophesSingleKeyDict() {
        const cfg = this.#wrappedConfig;

        if (cfg.apostrophesSingleKeyDict == null) {
            cfg.apostrophesSingleKeyDict = {"": ""};
            return;
        }

        const keys = Object.keys(cfg.apostrophesSingleKeyDict);

        if (!keys.length) {
            cfg.apostrophesSingleKeyDict = {"": ""};
            return;
        }

        // ensure dict has a single key:
        for (let i = 1; i < keys.length; i++) {
            delete cfg.apostrophesSingleKeyDict[keys[i]];
        }
    }

    /**
     * Makes dict structure normalized to common rules.
     */
    static #getNormalizedDictStructure(dict) {
        const res = {};

        if (dict == null) {
            return res;
        }

        for (const [key, value] of Object.entries(dict)) {
            const isArray = Array.isArray(value);
            const isValue = typeof value === 'string';
            const isArrayWith3Elems = isArray && value.length === 3; // pre-mid-post placing array

            if (isValue || isArrayWith3Elems) {
                res[key] = value;
                continue;
            }

            if (isArray) {
                if (value.length === 1) {
                    res[key] = value[0]; // should never happen
                    continue;
                }

                if (value.length === 0) {
                    res[key] = ""; // should never happen
                    continue;
                }

                if (value.length === 2) {
                    // E.g., "я": [ "à", "ya" ]
                    throw new Error(`Unsupported dict value type: ${value}. ${(this.#UNSUPPORTED_NON_DIACRITIC_VALUES_MSG)}.`);
                }
            }

            throw new Error(`Unsupported dict value type: ${value}`)
        }

        return res;
    }

    /**
     * Normalizes multiDict structure ensuring each value is a softening affection dict.
     */
    static #getNormalizedMultiDictStructure(multiDict) {
        const res = {};

        if (multiDict == null) {
            return res;
        }

        for (const [key, value] of Object.entries(multiDict)) {
            if (typeof value === 'string') {
                const valOrArr = value;
                const affectionDict = {};
                // let's make affection values the same:
                affectionDict[TransliterationConfig.#AFFECTED] = valOrArr;
                affectionDict[TransliterationConfig.#AFFECTING] = valOrArr;

                res[key] = TransliterationConfig.#getNormalizedDictStructure(affectionDict);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                // looks like already containing affection keys/values:
                res[key] = TransliterationConfig.#getNormalizedDictStructure(value);
            } else {
                // array?
                throw new Error(`Unsupported multiDict value type: ${value}. ${(this.#UNSUPPORTED_NON_DIACRITIC_VALUES_MSG)}.`);
            }
        }

        return res;
    }

    /**
     * Adds upper and title cased values to the dictionary.
     */
    static #completeByUpperAndTitleCased(/*[ref]*/arrOrDictOrMulti) {
        const toCaseFuncs = [
            Hlprs.toTitleCase,
            Hlprs.toUpperCase
            // TODO: append by func for 3 letters case (or probably each of possible combinations)
        ];

        if (Array.isArray(arrOrDictOrMulti)) { // e.g., [б, в, г]
            const letterSet = new Set(arrOrDictOrMulti);
            const toConcatSet = new Set();

            for (const letter of letterSet) {
                for (const toCaseFunc of toCaseFuncs) {
                    const toPush = toCaseFunc(letter);
                    if (!letterSet.has(toPush)) {
                        toConcatSet.add(toPush);
                    }
                }
            }
            arrOrDictOrMulti.push(...toConcatSet); // becomes e.g., [б, в, г, Б, В, Г]

        } else { // dictionary or multi-dictionary:
            const entries = Object.entries(arrOrDictOrMulti);
            for (const [lowerKey, lowerValOrArrOrAffectionDict] of entries) {
                for (const toCaseFunc of toCaseFuncs) {
                    const casedKey = toCaseFunc(lowerKey);
                    if (casedKey in arrOrDictOrMulti) {
                        continue;
                    }

                    if (typeof lowerValOrArrOrAffectionDict === 'string') { // single value like "la"
                        arrOrDictOrMulti[casedKey] = toCaseFunc(lowerValOrArrOrAffectionDict);
                        continue;
                    }

                    if (Array.isArray(lowerValOrArrOrAffectionDict)) { // pre-mid-post placing array
                        arrOrDictOrMulti[casedKey] = lowerValOrArrOrAffectionDict.map(toCaseFunc);
                        continue;
                    }

                    // affection dict, e.g., { "affected": "ie", "affecting": "ie" }
                    const casedAffectionDict = {};

                    const entries = Object.entries(lowerValOrArrOrAffectionDict);
                    for (const [affectionKey, affectionLowerVal] of entries) {
                        casedAffectionDict[affectionKey] = toCaseFunc(affectionLowerVal);
                    }

                    arrOrDictOrMulti[casedKey] = casedAffectionDict;
                }
            }
        }
    }
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = TransliterationConfig;
} else {
    // browser:
    window.TransliterationConfig = TransliterationConfig;
}
