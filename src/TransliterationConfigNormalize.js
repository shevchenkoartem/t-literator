const ArrHlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StringValueOrArrayHelpers')
    : /* browser */ StringValueOrArrayHelpers;

class TransliterationConfigNormalize {
    static #UNSUPPORTED_NON_DIACRITIC_VALUES_MSG = "Previously supported non-diacritic values are deprecated";

    static #AFFECTING = 'affecting';
    static #AFFECTED = 'affected';

    /**
     * Ensures the config is normalized according to specific rules.
     * This involves assigning default values to the config's properties if they have not been initialized.
     * Furthermore, it adjusts case inconsistencies in certain collections by adding their upper and title cased versions.
     * Once all transformations are complete, the `isNormalized` property of the config is set to true.
     */
    static normalize(cfg) {
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
        const normalizeDict = TransliterationConfigNormalize.#getNormalizedDictStructure;
        cfg.softableConsonantsDict = normalizeDict(cfg.softableConsonantsDict);
        cfg.dict = normalizeDict(cfg.dict);
        cfg.otherLanguagesLettersDict = normalizeDict(cfg.otherLanguagesLettersDict);
        cfg.specSymbolsDict = normalizeDict(cfg.specSymbolsDict);
        cfg.beforeStartDict = normalizeDict(cfg.beforeStartDict);
        cfg.afterFinishDict = normalizeDict(cfg.afterFinishDict);

        // multi-dictionaries:
        const normalizeMultiDict = TransliterationConfigNormalize.#getNormalizedMultiDictStructure;
        cfg.softingSignsMultiDict = normalizeMultiDict(cfg.softingSignsMultiDict);
        cfg.softingVowelsMultiDict = normalizeMultiDict(cfg.softingVowelsMultiDict);

        // single key dicts:
        TransliterationConfigNormalize.#normalizeApostrophesSingleKeyDict(cfg);

        // beforeStartDict uses its own rules:
        TransliterationConfigNormalize.#completeByUpperAndTitleCased(cfg.beforeStartDict);

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
            TransliterationConfigNormalize.#completeByUpperAndTitleCased(collection);
        }

        cfg.isNormalized = true;
    }

    /**
     * Ensures that the `apostrophesSingleKeyDict` property of the config has only one key.
     * If the dictionary is null or has no keys, it is initialized with an empty string key/value pair.
     * If there are multiple keys, it keeps the first one and removes the rest.
     */
    static #normalizeApostrophesSingleKeyDict(cfg) {
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
                affectionDict[TransliterationConfigNormalize.#AFFECTED] = valOrArr;
                affectionDict[TransliterationConfigNormalize.#AFFECTING] = valOrArr;

                res[key] = TransliterationConfigNormalize.#getNormalizedDictStructure(affectionDict);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                // looks like already containing affection keys/values:
                res[key] = TransliterationConfigNormalize.#getNormalizedDictStructure(value);
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
            ArrHlprs.toTitleCase,
            ArrHlprs.toUpperCase
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
    module.exports = TransliterationConfigNormalize;
} else {
    // browser:
    window.TransliterationConfigNormalize = TransliterationConfigNormalize;
}
