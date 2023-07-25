const Helpers = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StringValueOrArrayHelpers')
    : /* browser */ StringValueOrArrayHelpers;

const StrHelpers = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StrUtils')
    : /* browser */ StrUtils;

const CfgHelpers = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/ConfigHelpers')
    : /* browser */ ConfigHelpers;

const FromGitHubReader = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/GitHubConfigProvider')
    : /* browser */ GitHubConfigProvider;

const Config = typeof window === 'undefined'
    ? /* Node.js */ require('./TransliterationConfig')
    : /* browser */ TransliterationConfig;

const Configs = typeof window === 'undefined'
    ? /* Node.js */ require('./TransliterationConfigCollection')
    : /* browser */ TransliterationConfigCollection;

class Transliterator {
    #WORD_START = '【⟨'; // TODO: make static?
    #WORD_END = '⟩】';
    static #UPPER_TECH_LETER = 'Ꙍ';
    static #LOWER_TECH_LETER = 'ꙍ';

    #currentConfig = {};
    #configs = {};

    /**
     * The field is of type IConfigObjectProvider.
     * We are not using TypeScript here, but imagine declaring this "interface":
     *
     *      interface IConfigObjectProvider {
     *          getConfigObject(cfgCode: string): { [key: string]: any };
     *      }
     */
    #configObjectProvider; // TODO: make this getting text, not JSON. And under the hood do JSON parsing with removing comments: txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')

    constructor(rawConfigsOrConfigObjectProvider = new FromGitHubReader(), /*[optional]*/  cfgName) {
        let rawConfigsToInitialize = [];

        if (Array.isArray(rawConfigsOrConfigObjectProvider)) {
            // raw configs array is passed:
            rawConfigsToInitialize = rawConfigsOrConfigObjectProvider;
        } else {
            // specific configObjectProvider is passed:
            this.#configObjectProvider = rawConfigsOrConfigObjectProvider;
        }

        this.#configs = new Configs(rawConfigsToInitialize);

        if (cfgName != null) {
            this.useConfig(cfgName);
        }
    }

    get config() {
        return {...this.#currentConfig};
    }

    // TODO: PROFILER: heavy usage
    transliterate(txt) {
        const cfg = this.#currentConfig;
        let lat = txt;

        if (cfg.useLocationInWordAlgo) {
            lat = this.#markStartingPositions(lat);
        }

        lat = this.#replaceAllByDict(lat,
            cfg.beforeStartDict,
            cfg.useLocationInWordAlgo);

        const tempApo = '⟨≀⟩';
        const apostrophesStr = Object.keys(cfg.apostrophesSingleKeyDict)[0];
        // To not mix real apostrophes with softing ones which possibly will be added on the next step
        lat = StrHelpers.replaceLettersFromStr(lat, Array.from(apostrophesStr), tempApo);

        const softingVowelsMultiDictEntries = Object.entries(cfg.softingVowelsMultiDict);
        const softableConsonantsDictEntries = Object.entries(cfg.softableConsonantsDict);
        const softingSignsMultiDictEntries = Object.entries(cfg.softingSignsMultiDict);

        for (const [softingVow, softingVowVals] of softingVowelsMultiDictEntries) {
            for (const unsoftableCon of cfg.unsoftableConsonants) {
                const softedVowVals = /*cfg.affectVowelNotConsonantWhenSofting
                    ? softingVowVals[Config.AFFECTING]
                    : */
                    softingVowVals[Config.AFFECTED]; // when con is unsoftable, vow is forcibly soften

                if (cfg.useLocationInWordAlgo && Array.isArray(softedVowVals)) { // todo: rename to single?
                    const softedVowValLocated = CfgHelpers.getPositionalValue_Post(softedVowVals);
                    lat = lat.replaceAll(
                        unsoftableCon + softingVow + this.#WORD_END,
                        unsoftableCon + softedVowValLocated + this.#WORD_END
                    );
                    // TODO: + beginning with unsoftable
                }

                // replace either value (common case) or middle value (if useLocationInWordAlgo):
                const softedVowVal = CfgHelpers.getPositionalValue_Mid(softedVowVals);
                lat = lat.replaceAll(
                    unsoftableCon + softingVow,
                    unsoftableCon + softedVowVal
                );
            }

            for (const [conToSoften, softedConVals] of softableConsonantsDictEntries) {
                // TODO: consider useLocationInWordAlgo

                const conAfterSoftening = cfg.affectVowelNotConsonantWhenSofting
                    ? conToSoften
                    : CfgHelpers.getPositionalValue_Mid(softedConVals);

                if (cfg.useLocationInWordAlgo && Array.isArray(softingVowVals[Config.AFFECTING])) {
                    const vowAfterSofteningLocated = CfgHelpers.getPositionalValue_Post(softingVowVals[Config.AFFECTING]);
                    lat = lat.replaceAll(
                        conToSoften + softingVow + this.#WORD_END,
                        conAfterSoftening + vowAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const vowAfterSoftening = CfgHelpers.getPositionalValue_Mid(softingVowVals[Config.AFFECTING]);
                lat = lat.replaceAll(
                    conToSoften + softingVow,
                    conAfterSoftening + vowAfterSoftening
                );
            }
        }

        for (const [softingSign, softingSignSubDict] of softingSignsMultiDictEntries) {
            for (const unsoftableCon of cfg.unsoftableConsonants) {
                // TODO: think (and see prev. sample if needed)
                // TODO: consider useLocationInWordAlgo!!!
                lat = lat.replaceAll(
                    unsoftableCon + softingSign,
                    unsoftableCon + softingSignSubDict[Config.AFFECTED]
                );
            }

            for (const [conToSoften, softedConVals] of softableConsonantsDictEntries) {
                // TODO: consider useLocationInWordAlgo, recheck

                const conAfterSoftening = CfgHelpers.getPositionalValue_Mid(softedConVals);

                if (cfg.useLocationInWordAlgo && Array.isArray(softingSignSubDict[Config.AFFECTING])) {
                    const softingSignAfterSofteningLocated = CfgHelpers.getPositionalValue_Post(softingSignSubDict[Config.AFFECTING]);
                    lat = lat.replaceAll(
                        conToSoften + softingSign + this.#WORD_END,
                        conAfterSoftening + softingSignAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const softingSignAfterSoftening = CfgHelpers.getPositionalValue_Mid(softingSignSubDict[Config.AFFECTING]);
                lat = lat.replaceAll(
                    conToSoften + softingSign,
                    conAfterSoftening + softingSignAfterSoftening
                );
            }

            lat = lat.replaceAll(softingSign, softingSignSubDict[Config.AFFECTED]); // if softing sign is used unexpectedly
        }

        lat = lat.replaceAll(tempApo, cfg.apostrophesSingleKeyDict[apostrophesStr]); // Replace apostrophes

        lat = this.#replaceAllByDict(lat, cfg.dict, cfg.useLocationInWordAlgo); // todo check last params inside the method instead passing
        lat = this.#replaceAllByDict(lat, cfg.otherLanguagesLettersDict, cfg.useLocationInWordAlgo);
        lat = this.#replaceAllByDict(lat, cfg.specSymbolsDict, cfg.useLocationInWordAlgo);

        if (cfg.useLocationInWordAlgo) {
            lat = StrHelpers.removeLettersFromStr(lat, [
                this.#WORD_START,
                this.#WORD_END]);
        }

        lat = this.#detectAndFixCapsLocked(lat);

        lat = this.#replaceAllByDict(lat, cfg.afterFinishDict, cfg.useLocationInWordAlgo);

        if (cfg.substitutionForUndefinedResult != null) {
            lat = lat.replaceAll('undefined', cfg.substitutionForUndefinedResult);
        }

        return lat;
    }

    useConfig(cfgCode) {
        if (this.#currentConfig.code === cfgCode) {
            return; // already in use
        }

        if (!this.#configs.hasConfig(cfgCode)) {
            const cfg = this.#configObjectProvider.getConfigObject(cfgCode);
            this.#configs.upsertConfig(cfg);
        }

        this.#currentConfig = this.#configs.getConfig(cfgCode);
    }

    /**
     * Returns a mapping of source alphabet letters to their transliterated alphabet letters based on the current config.
     * The mapping is generated by real transliterating process, not by just getting the config's dict.
     * @param {boolean} ignorePositionalCases - Whether to ignore positional cases (when a letter can be transliterated differently depending on its position in a word) when generating the mapping.
     * @param {boolean} ignoreSofteningCases - Whether to ignore softening cases when generating the mapping.
     * @returns {Object} - A dictionary with pairs like { "Є є": "Je je, ie" }
     */
    getConfigTransliterationInfo(ignorePositionalCases = false, ignoreSofteningCases = false) {
        return this.#currentConfig.getTransliterationInfo(this, ignorePositionalCases, ignoreSofteningCases);
    }

// TODO: temporary; rewrite tests and get rid of it.
// DEPRECATED: Use the appropriate TransliteratorConfig method instead?
    getConfigSourceAlphabet(getOnlyLower = false, includeOtherLangLettersTransliteration = false) {
        return this.#currentConfig.getSourceAlphabet(getOnlyLower, includeOtherLangLettersTransliteration);
    }

// DEPRECATED: Use the appropriate TransliteratorConfig method instead?
    /**
     * Returns unique sorted letters of the transliterated config's source alphabet.
     *
     * @param {boolean} getOnlyLower - Whether to return only lowercase letters.
     * @param {boolean} includeOtherLangLettersTransliteration - Whether to include transliteration for other language letters.
     * @returns {string[]} An array of unique sorted letters.
     */
    getConfigTransliteratedAlphabet(getOnlyLower = false, includeOtherLangLettersTransliteration = false) {
        return this.#currentConfig.getTransliteratedAlphabet(this, getOnlyLower, includeOtherLangLettersTransliteration)
    }

    #markStartingPositions(txt) {
        const letters = this.#currentConfig.getSourceAlphabet(false, true)
            .concat([Transliterator.#UPPER_TECH_LETER, Transliterator.#LOWER_TECH_LETER])
            .join('');

        let pattern = new RegExp(`(?<a>^|[^${letters}]+)(?<b>[${letters}])`, 'gu');
        let res = txt.replaceAll(pattern, `$<a>${this.#WORD_START}$<b>`);

        pattern = new RegExp(`(?<b>[${letters}])(?<c>$|[^${letters}]+)`, 'gu');
        res = res.replaceAll(pattern, `$<b>${this.#WORD_END}$<c>`);

        // Words with apostrophe is a single word:
        pattern = new RegExp(`(?<a>${this.#WORD_END})(?<b>['\`‘’])(?<c>${this.#WORD_START})`, 'gu');
        res = res.replaceAll(pattern, `$<b>`);

        return res;
    }

    /**
     * Fixes uppercase issues, e.g. "ЩУКА"->"ŠčUKA" to "ŠČUKA"
     */
    #detectAndFixCapsLocked(txt) {
        const digraphs = new Set(this.#currentConfig.getDigraphs().map(digraph => StrHelpers.toLowerCase(digraph)));

        // This regex contains 6 groups (for 2 main cases):
        //    Case 1: Issue(')AFTERWORD (groups: Issue = a, possible apostrophe = p, AFTERWORD = b)
        // OR Case 2: BEFOREWORD(')Issue (groups: BEFOREWORD = c, possible apostrophe = q, Issue = d)
        // TODO: append other spec symbols to p and q
        const pattern = /(?<a>\p{Lu}\p{Ll}+)(?<p>['"]*)(?<b>\p{Lu}+)|(?<c>\p{Lu}+)(?<q>['"]*)(?<d>\p{Lu}\p{Ll}+)/gu;

        const replaceAt = (str, index, replacement) =>
            str.slice(0, index)
            + replacement
            + str.slice(index + replacement.length);

        let words = txt.split(" ");

        const maxRepeatTimes = 5; // run several times to fix more complex cases
        for (let repeat = 0; repeat < maxRepeatTimes; repeat++) {
            let matchesWereFound = false;
            words = words.map(word => {
                let match;

                while (match = pattern.exec(word)) {
                    const {groups} = match;

                    const before = groups.c || '';
                    const specSymb1 = groups.q || '';
                    const probablyIssue = groups.a || groups.d;
                    const specSymb2 = groups.p || '';
                    const after = groups.b || '';

                    if (digraphs.has(StrHelpers.toLowerCase(probablyIssue))) {
                        word = replaceAt(
                            word,
                            match.index,
                            before
                            + specSymb1
                            + Helpers.toUpperCase(probablyIssue, this.#currentConfig.exceptionalCaseRules)
                            + specSymb2
                            + after
                        );
                    }

                    if (!matchesWereFound) matchesWereFound = true;
                }

                return word;
            });

            if (!matchesWereFound) break;
        }

        return words.join(" ");
    }


    #replaceAllByDict(src, dict, useLocationInWordAlgo) {
        let res = src;

        const entries = Object.entries(dict);
        for (const [key, vals] of entries) {
            const valOrPositionalVals = vals;

            if (useLocationInWordAlgo && Array.isArray(valOrPositionalVals)) {
                res = res.replaceAll(this.#WORD_START + key, this.#WORD_START + CfgHelpers.getPositionalValue_Pre(valOrPositionalVals));
                res = res.replaceAll(key + this.#WORD_END, CfgHelpers.getPositionalValue_Post(valOrPositionalVals) + this.#WORD_END);
            }

            // replace either value (common case) or middle value (if useLocationInWordAlgo):
            res = res.replaceAll(key, CfgHelpers.getPositionalValue_Mid(valOrPositionalVals));
        }

        return res;
    }
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = Transliterator;
} else {
    // browser:
    window.Transliterator = Transliterator;
}
