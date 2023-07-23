const Helpers = typeof window === 'undefined'
    ? /* Node.js */ require('./0-string-value-or-array-helpers')
    : /* browser */ StringValueOrArrayHelpers;

const FromGitHubReader = typeof window === 'undefined'
    ? /* Node.js */ require('./0-default-config-reader-from-github')
    : /* browser */ DefaultConfigReaderFromGitHub;

const Config = typeof window === 'undefined'
    ? /* Node.js */ require('./1-normalized-config')
    : /* browser */ NormalizedConfig;

const Configs = typeof window === 'undefined'
    ? /* Node.js */ require('./2-configs-collection')
    : /* browser */ ConfigsCollection;

class Transliterator {
    #WORD_START = '【⟨'; // TODO: make static?
    #WORD_END = '⟩】';
    static #UPPER_TECH_LETER = 'Ꙍ';
    static #LOWER_TECH_LETER = 'ꙍ';

    static RESULT_OTHERS_KEY = "_others_";

    #config = {};
    #configsCache = {};
    #implementingGetConfigObject; // TODO: make this getting text, not JSON. And under the hood do JSON parsing with removing comments: txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')

    #useDiacritics = true; //TODO: get rid of it

    static stringUtils = {
        // TODO: consider StringValueOrArrayHelpers.toUpperCase - should it be modified and used instead?
        toUpperCase: function (v) {
            return v.toLocaleUpperCase();
        },
        toLowerCase: function (v) {
            return v.toLocaleLowerCase();
        },
        removeLettersFromStr: function (v, lettersToRemove) {
            return lettersToRemove.reduce((accumulated, letter) => accumulated.replaceAll(letter, ''), v);
        }
    };

    constructor(rawConfigsOrImplementingGetConfigObject = new FromGitHubReader(), /*[optional]*/  cfgName) {
        let rawConfigsToInitialize = [];

        if (Array.isArray(rawConfigsOrImplementingGetConfigObject)) {
            // raw configs array is passed:
            rawConfigsToInitialize = rawConfigsOrImplementingGetConfigObject;
        } else {
            // specific implementingGetConfigObject is passed:
            this.#implementingGetConfigObject = rawConfigsOrImplementingGetConfigObject;
        }

        this.#configsCache = new Configs(rawConfigsToInitialize);

        if (cfgName != null) {
            this.useConfig(cfgName);
        }
    }

    get config() {
        return {...this.#config};
    }

    // TODO: PROFILER: heavy usage
    transliterate(txt, doNotUseDiacritic) {
        const cfg = this.#config;

        this.#useDiacritics = !doNotUseDiacritic; // TODO: get rid of this field
        const indexToGet = !this.#useDiacritics ? 1 : 0;

        let lat = txt;

        if (cfg.useLocationInWordAlgo) {
            lat = this.#markStartingPositions(lat);
        }

        lat = this.#replaceAllByDict(lat,
            cfg.beforeStartDict,
            cfg.useLocationInWordAlgo);

        const tempApo = '⟨≀⟩';
        const apostrophesStr = Object.keys(cfg.apostrophesSingleKeyDict)[0];
        for (const apo of apostrophesStr.split('')) {
            lat = lat.replaceAll(apo, tempApo); // To not mix real apostophes with softing ones which possibly will be added on the next step
        }

        for (const [softingVow, softingVowVals] of Object.entries(cfg.softingVowelsMultiDict)) {
            for (const unsoftableCon of cfg.unsoftableConsonants) {
                const softedVowVals = /*cfg.affectVowelNotConsonantWhenSofting
                    ? softingVowVals[Config.AFFECTING]
                    : */
                    softingVowVals[Config.AFFECTED]; // when con is unsoftable, vow is forcibly soften

                if (cfg.useLocationInWordAlgo && Array.isArray(softedVowVals[indexToGet])) {
                    const softedVowValLocated = Transliterator.#getPositionalValue(softedVowVals[indexToGet], 2);
                    lat = lat.replaceAll(
                        unsoftableCon + softingVow + this.#WORD_END,
                        unsoftableCon + softedVowValLocated + this.#WORD_END
                    );
                    // TODO: + beginning with unsoftable
                }

                // replace either value (common case) or middle value (if useLocationInWordAlgo):
                const softedVowVal = Transliterator.#getPositionalValue(softedVowVals[indexToGet]);
                lat = lat.replaceAll(
                    unsoftableCon + softingVow,
                    unsoftableCon + softedVowVal
                );
            }

            for (const [conToSoften, softedConVals] of Object.entries(cfg.softableConsonantsDict)) {
                // TODO: consider useLocationInWordAlgo

                const conAfterSoftening = cfg.affectVowelNotConsonantWhenSofting
                    ? conToSoften
                    : Transliterator.#getPositionalValue(softedConVals[indexToGet]);

                if (cfg.useLocationInWordAlgo && Array.isArray(softingVowVals[Config.AFFECTING][indexToGet])) {
                    const vowAfterSofteningLocated = Transliterator.#getPositionalValue(softingVowVals[Config.AFFECTING][indexToGet], 2);
                    lat = lat.replaceAll(
                        conToSoften + softingVow + this.#WORD_END,
                        conAfterSoftening + vowAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const vowAfterSoftening = Transliterator.#getPositionalValue(softingVowVals[Config.AFFECTING][indexToGet]);
                lat = lat.replaceAll(
                    conToSoften + softingVow,
                    conAfterSoftening + vowAfterSoftening
                );
            }
        }

        for (const [softingSign, softingSignSubDict] of Object.entries(cfg.softingSignsMultiDict)) {
            for (const unsoftableCon of cfg.unsoftableConsonants) {
                // TODO: think (and see prev. sample if needed)
                // TODO: consider useLocationInWordAlgo!!!
                lat = lat.replaceAll(
                    unsoftableCon + softingSign,
                    unsoftableCon + softingSignSubDict[Config.AFFECTED][indexToGet]
                );
            }

            for (const [conToSoften, softedConVals] of Object.entries(cfg.softableConsonantsDict)) {
                // TODO: consider useLocationInWordAlgo, recheck

                const conAfterSoftening = Transliterator.#getPositionalValue(softedConVals[indexToGet]);

                if (cfg.useLocationInWordAlgo && Array.isArray(softingSignSubDict[Config.AFFECTING][indexToGet])) {
                    const softingSignAfterSofteningLocated = Transliterator.#getPositionalValue(softingSignSubDict[Config.AFFECTING][indexToGet], 2);
                    lat = lat.replaceAll(
                        conToSoften + softingSign + this.#WORD_END,
                        conAfterSoftening + softingSignAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const softingSignAfterSoftening = Transliterator.#getPositionalValue(softingSignSubDict[Config.AFFECTING][indexToGet]);
                lat = lat.replaceAll(
                    conToSoften + softingSign,
                    conAfterSoftening + softingSignAfterSoftening
                );
            }

            lat = lat.replaceAll(softingSign, softingSignSubDict[Config.AFFECTED][indexToGet]); // if softing sign is used unexpectedly
        }

        lat = lat.replaceAll(tempApo, cfg.apostrophesSingleKeyDict[apostrophesStr]); // Replace apostrophes

        lat = this.#replaceAllByDict(lat, cfg.dict, cfg.useLocationInWordAlgo); // todo check last params inside the method instead passing
        lat = this.#replaceAllByDict(lat, cfg.otherLanguagesLettersDict, cfg.useLocationInWordAlgo);
        lat = this.#replaceAllByDict(lat, cfg.specSymbolsDict, cfg.useLocationInWordAlgo);

        if (cfg.useLocationInWordAlgo) {
            lat = Transliterator.stringUtils.removeLettersFromStr(lat, [
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
        if (this.#config.code === cfgCode) {
            return; // already in use
        }

        if (!this.#configsCache.hasConfig(cfgCode)) {
            const cfg = this.#implementingGetConfigObject.getConfigObject(cfgCode);
            this.#configsCache.upsertConfig(cfg);
        }

        this.#config = this.#configsCache.getConfig(cfgCode);
    }

    // TODO: kind of CONFIG functionality part (but it uses transliterate!!!!)
    // TODO: still needs some refactoring and caching
    // TODO: PROFILER: long time running
    /**
     * Returns a mapping of source alphabet letters to their transliterated alphabet letters based on the current config.
     * The mapping is generated by real transliterating process, not by just getting the config's dict.
     * @param {boolean} ignorePositionalCases - Whether to ignore positional cases (when a letter can be transliterated differently depending on its position in a word) when generating the mapping.
     * @param {boolean} ignoreSofteningCases - Whether to ignore softening cases when generating the mapping.
     * @returns {Object} - A dictionary with pairs like { "Є є": "Je je, ie" }
     */
    getConfigTransliterationInfo(ignorePositionalCases, ignoreSofteningCases) {
        const cfg = this.#config;

        const result = {};
        const sourceAlphabet = cfg.getSourceAlphabet(false, false);

        const srcVowels = new Set(this.#getSourceVowels(true));
        const exemplars = this.#getSoftingExemplars(cfg);

        const keysListIncludes = (obj, key) => obj.hasOwnProperty(key);

        for (let upr = 0, lwr = 1; upr < sourceAlphabet.length - 1; upr += 2, lwr += 2) {
            const [upper, lower] = [sourceAlphabet[upr], sourceAlphabet[lwr]];
            const currResults = [];

            if (keysListIncludes(cfg.softingSignsMultiDict, upper)) {
                // TODO: try to make pushTransliteratedResult() versatile
                //  - it's almost the same as in the other places
                const pushTransliteratedResult = (exemplar) => {
                    const res = this.transliterate(`${exemplar.upper.source}${upper}`)
                        + ' '
                        + this.transliterate(`${exemplar.lower.source}${lower}`);

                    const toRemove = [exemplar.upper.translated, exemplar.lower.translated];
                    const toPush = Transliterator.stringUtils.removeLettersFromStr(res, toRemove);
                    currResults.push(toPush);
                };

                pushTransliteratedResult(exemplars.softableConsonant);
                pushTransliteratedResult(exemplars.unsoftableConsonant);

            } else {
                const toPush = this.transliterate(upper) + ' ' + this.transliterate(lower);
                currResults.push(toPush);

                if (!ignorePositionalCases) {
                    const midLowerRes = this.transliterate(Transliterator.#LOWER_TECH_LETER + lower + Transliterator.#LOWER_TECH_LETER);
                    const midCaseRes = midLowerRes + ' ' + midLowerRes; // the same because it's a middle

                    const endLowerRes = this.transliterate(Transliterator.#LOWER_TECH_LETER + lower);
                    const endCaseRes = endLowerRes + ' ' + endLowerRes;

                    const removeTechLetters = function (str) {
                        return Transliterator.stringUtils.removeLettersFromStr(str, [
                            Transliterator.#UPPER_TECH_LETER,
                            Transliterator.#LOWER_TECH_LETER
                        ]);
                    };

                    let toPush = removeTechLetters(midCaseRes);
                    currResults.push(toPush);

                    toPush = removeTechLetters(endCaseRes);
                    currResults.push(toPush);
                }

                if (!ignoreSofteningCases) {
                    if (srcVowels.has(upper)) {
                        const that = this;
                        const removeSofteningLetters = function (str) {
                            return Transliterator.stringUtils.removeLettersFromStr(str, [
                                that.transliterate(exemplars.softableConsonant.upper.source),
                                that.transliterate(exemplars.softableConsonant.lower.source),
                                that.transliterate(exemplars.unsoftableConsonant.upper.source),
                                that.transliterate(exemplars.unsoftableConsonant.lower.source)
                            ]);
                        };

                        const pushTransliteratedResult = (exemplar) => {
                            if (exemplar.upper.source != null && exemplar.lower.source != null) {
                                const res = this.transliterate(exemplar.lower.source + lower);
                                const result = res + ' ' + res;

                                const toPush = removeSofteningLetters(result)
                                currResults.push(toPush);
                            }
                        };
                        if (cfg.affectVowelNotConsonantWhenSofting) {
                            pushTransliteratedResult(exemplars.softableConsonant);
                        }
                        pushTransliteratedResult(exemplars.unsoftableConsonant);

                    } else if (keysListIncludes(cfg.softableConsonantsDict, upper)) {
                        const pushTransliteratedResult = (exemplar) => {
                            if (exemplar.upper.source != null && exemplar.lower.source != null) {
                                const result = this.transliterate(upper + exemplar.upper.source)
                                    + ' '
                                    + this.transliterate(lower + exemplar.lower.source);

                                const toPush = Transliterator.stringUtils.removeLettersFromStr(result, [
                                    exemplar.upper.translated,
                                    exemplar.lower.translated]);

                                currResults.push(toPush);
                            }
                        };
                        pushTransliteratedResult(exemplars.softingSign);

                        if (!ignorePositionalCases) {
                            // TODO: think if it's ever needed at all - positional softed cases
                        }
                    } else {
                        // no need to soften
                    }
                }
            }

            const transformIfNeeded = (toPush) => {
                const spl = toPush.split(' ');
                const areSame = spl[0] === spl[1]; // e.g. both are apostrophes: "' '"
                const firstCantBeUsedAtWordsBeginning
                    = Helpers.toDiacriticless(spl[0]).length > 1 && spl[0] === Transliterator.stringUtils.toUpperCase(spl[1]); // when using positional algo, some mid- and ending cases only can be fully upper-cased, not title-cased (because a word simply cannot start with it)

                return (spl.length === 2 && (areSame || firstCantBeUsedAtWordsBeginning))
                    ? spl[1] // return a single value (lower), not a pair
                    : toPush;
            };

            // at(-1) is not supported by Safari :(
            const last = (arr) => (arr == null || !arr.length) ? undefined : arr[arr.length - 1];

            result[upper + ' ' + lower] = currResults
                .filter((v, i, s) => s
                        .map(m => Transliterator.stringUtils.toUpperCase(last(m.split(' '))))
                        .indexOf(Transliterator.stringUtils.toUpperCase(last(v.split(' '))))
                    === i) // only with unique latest value (case insens.)
                .map(v => (v.length && v.match(/\S.*/) != null) ? v : '—') // if whitespaced or empty - replace with '—'
                .map(v => transformIfNeeded(v))
                .join(', ');
        }

        const getResultWithOtherLetters = (result) => {
            const resultValuesStr = Object.values(result).join(', ');
            const otherLetters = this.getTransliteratedAlphabet(true)
                .filter(l => !resultValuesStr.includes(l))
                .join(', '); // todo: add uppers as well and format into pairs

            // TODO: check this fix (does it add some unnecessary letters?):
            /*
            const resultValuesSet = new Set(Object.values(result).flatMap(s => s.split(' ')));

            const otherLetters = this.getTransliteratedAlphabet(true)
                .filter(l => !resultValuesSet.has(l))
                .join(', '); // todo: add uppers as well and format into pairs
            */

            if (otherLetters.length) {
                result[Transliterator.RESULT_OTHERS_KEY] = otherLetters;
            }
            return result;
        };

        return getResultWithOtherLetters(result);
    }

    /**
     * Returns an object containing single exemplars of the config's softening mechanism.
     * The object returned contains softable and unsoftable consonants and softing sign exemplars:
     * upper and lower, source and translated.
     */
    #getSoftingExemplars(cfg) {
        const indexToGet = !this.#useDiacritics ? 1 : 0;

        const softableUpperCon = Object.keys(cfg.softableConsonantsDict).find(v => Transliterator.stringUtils.toUpperCase(v) === v);
        const softableLowerCon = Object.keys(cfg.softableConsonantsDict).find(v => Transliterator.stringUtils.toLowerCase(v) === v);

        const unsoftableUpperCon = cfg.unsoftableConsonants.find(v => Transliterator.stringUtils.toUpperCase(v) === v);
        const unsoftableLowerCon = cfg.unsoftableConsonants.find(v => Transliterator.stringUtils.toLowerCase(v) === v);

        let softableUpperConTransed;
        let softableLowerConTransed;
        let unsoftableUpperConTransed;
        let unsoftableLowerConTransed;

        if (softableUpperCon != null && softableLowerCon != null) {
            softableUpperConTransed = Transliterator.#getPositionalValue(cfg.softableConsonantsDict[softableUpperCon][indexToGet], 2);
            softableLowerConTransed = Transliterator.#getPositionalValue(cfg.softableConsonantsDict[softableLowerCon][indexToGet], 2);
        }
        if (unsoftableUpperCon != null && unsoftableLowerCon != null) {
            unsoftableUpperConTransed = this.transliterate(unsoftableUpperCon);
            unsoftableLowerConTransed = this.transliterate(unsoftableLowerCon);
        }

        const upperSoftingSign = Object.keys(cfg.softingSignsMultiDict).find(v => Transliterator.stringUtils.toUpperCase(v) === v);
        const lowerSoftingSign = Object.keys(cfg.softingSignsMultiDict).find(v => Transliterator.stringUtils.toLowerCase(v) === v);

        let affectingUpperSoftingSignTransed;
        let affectingLowerSoftingSignTransed;

        if (upperSoftingSign != null && lowerSoftingSign != null) {
            affectingUpperSoftingSignTransed = Transliterator.#getPositionalValue(cfg.softingSignsMultiDict[upperSoftingSign][Config.AFFECTING][indexToGet], 2);
            affectingLowerSoftingSignTransed = Transliterator.#getPositionalValue(cfg.softingSignsMultiDict[lowerSoftingSign][Config.AFFECTING][indexToGet], 2);
        }

        return {
            softableConsonant: {
                upper: {source: softableUpperCon, translated: softableUpperConTransed},
                lower: {source: softableLowerCon, translated: softableLowerConTransed}
            },
            unsoftableConsonant: {
                upper: {source: unsoftableUpperCon, translated: unsoftableUpperConTransed},
                lower: {source: unsoftableLowerCon, translated: unsoftableLowerConTransed}
            },
            softingSign: {
                upper: {source: upperSoftingSign, translated: affectingUpperSoftingSignTransed},
                lower: {source: lowerSoftingSign, translated: affectingLowerSoftingSignTransed}
            }
        };
    }

    // TODO: temporary; rewrite tests and get rid of it.
    getConfigSourceAlphabet(getOnlyLower, includeOtherLangLettersTransliteration) {
        return this.#config.getSourceAlphabet(getOnlyLower, includeOtherLangLettersTransliteration);
    }

    // TODO: looks like CONFIG functionality part (but it uses transliterate!!!!)
    // TODO: think how include substitutional letters regardless of includeOtherLangLettersTransliteration!!
    /**
     * Returns unique sorted letters of the transliterated config's source alphabet.
     *
     * @param {boolean} getOnlyLower - Whether to return only lowercase letters.
     * @param {boolean} includeOtherLangLettersTransliteration - Whether to include transliteration for other language letters.
     * @returns {string[]} An array of unique sorted letters.
     */
    getTransliteratedAlphabet(getOnlyLower, includeOtherLangLettersTransliteration) {
        const cfg = this.#config;

        const dontUseDiacritics = false; // !this.#useDiacritics todo: get rid of #useDiacritics!
        let letterHeap = [...Helpers.flatValuesAt(cfg.beforeStartDict, dontUseDiacritics)
            .map(val => this.transliterate(val))]; // TODO: refactor others places to use map(), filter() and others

        const valsToRunThruAfterFinishDict = [
            ...Helpers.flatValuesAt(cfg.dict, dontUseDiacritics),
            ...Helpers.flatValuesAt(cfg.apostrophesSingleKeyDict, dontUseDiacritics),
            ...Helpers.flatValuesAt(cfg.softableConsonantsDict, dontUseDiacritics),
            ...Helpers.flatValuesAt(cfg.softingVowelsMultiDict, dontUseDiacritics),
            ...Helpers.flatValuesAt(cfg.softingSignsMultiDict, dontUseDiacritics),
            ...(includeOtherLangLettersTransliteration
                ? Helpers.flatValuesAt(cfg.otherLanguagesLettersDict, dontUseDiacritics)
                : [])
        ];

        for (const val of valsToRunThruAfterFinishDict) {
            if (val == null) {
                continue; // should never happen (but happens – TODO: investigate)
            }

            let res = [...Object.entries(cfg.afterFinishDict)]
                // TODO: consider positionInWordAlgo in afterFinishDict:
                .reduce((accumulated, [afterKey, afterVal]) => accumulated.replaceAll(afterKey, afterVal), val);
            letterHeap.push(res);
        }

        letterHeap.push(...Helpers.flatValuesAt(cfg.afterFinishDict, dontUseDiacritics));

        const letters = letterHeap.reduce((accumulated, el) => {
            if (el == null) {
                return accumulated; // should never happen
            }

            let len = Helpers.toDiacriticless(el).length;

            if (len === 1 && (!getOnlyLower || el === Transliterator.stringUtils.toLowerCase(el))) {
                return [...accumulated, el];
            }

            // add each letter separately:
            if (len > 1) {
                while (len--) {
                    accumulated.push(getOnlyLower ? Transliterator.stringUtils.toLowerCase(el.charAt(len)) : el.charAt(len));
                }
            }

            return accumulated;
        }, []);

        const uniqueLetters = [...new Set(letters)];

        return uniqueLetters
            .sort(Config.alphabetOrderComparator);
    }

    #markStartingPositions(txt) {
        const letters = this.#config.getSourceAlphabet(false, true)
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
        const digraphs = new Set(this.#config.getDigraphs().map(digraph => Transliterator.stringUtils.toLowerCase(digraph)));

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

                    if (digraphs.has(Transliterator.stringUtils.toLowerCase(probablyIssue))) {
                        word = replaceAt(
                            word,
                            match.index,
                            before
                            + specSymb1
                            + Helpers.toUpperCase(probablyIssue, this.#config.exceptionalCaseRules)
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
        const indexToGet = !this.#useDiacritics ? 1 : 0;
        let res = src;

        for (const [key, vals] of Object.entries(dict)) {
            const valOrPositionalVals = vals[indexToGet];

            if (useLocationInWordAlgo && Array.isArray(valOrPositionalVals)) {
                res = res.replaceAll(this.#WORD_START + key, this.#WORD_START + Transliterator.#getPositionalValue(valOrPositionalVals, 0));
                res = res.replaceAll(key + this.#WORD_END, Transliterator.#getPositionalValue(valOrPositionalVals, 2) + this.#WORD_END);
            }

            // replace either value (common case) or middle value (if useLocationInWordAlgo):
            res = res.replaceAll(key, Transliterator.#getPositionalValue(valOrPositionalVals));
        }

        return res;
    }

    // TODO: CONFIG functionality part
    #getSourceVowels(includeOtherLangLetters) {
        const generalCyrVowels = new Set([
            'А', 'а', 'Е', 'е', 'Ё', 'ё',
            'Є', 'є', 'И', 'и', 'І', 'і',
            'Ї', 'ї', 'О', 'о', 'У', 'у',
            'Ы', 'ы', 'Э', 'э', 'Ю', 'ю',
            'Я', 'я'
        ]);
        const alphabet = this.#config.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalCyrVowels.has(l));
    }


    // TODO: CONFIG functionality part
    #getSourceConsonants(includeOtherLangLetters) {
        const generalCyrConsonants = new Set([
            'Б', 'б', 'В', 'в', 'Г', 'г', 'Ґ', 'ґ', 'Д',
            'д', 'Ѓ', 'ѓ', 'Ђ', 'ђ', 'Ж', 'ж', 'З', 'з',
            'З́', 'з́', 'Ѕ', 'ѕ', 'Й', 'й', 'Ј', 'ј', 'К',
            'к', 'Л', 'л', 'Љ', 'љ', 'М', 'м', 'Н', 'н',
            'Њ', 'њ', 'П', 'п', 'Р', 'р', 'С', 'с', 'С́',
            'с́', 'Т', 'т', 'Ћ', 'ћ', 'Ќ', 'ќ', 'Ў', 'ў',
            'Ф', 'ф', 'Х', 'х', 'Ц', 'ц', 'Ч', 'ч', 'Џ',
            'џ', 'Ш', 'ш', 'Щ', 'щ'
        ]);

        const alphabet = this.#config.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalCyrConsonants.has(l));

        /*      this.#config.unsoftableConsonants.concat(Object.keys(this.#config.softableConsonantsDict));

                const indexToGet = !this.#useDiacritics ? 1 : 0;
                const resultFromBeforeStartDict = [];
                for (const con of result) {
                    for (const [key, vals] of Object.entries(this.#config.beforeStartDict)) {
                        const valOrArr = vals[indexToGet];

                        const needToPush = Array.isArray(valOrArr)
                            ? valOrArr.includes(con)
                            : valOrArr === con;

                        if (needToPush) {
                            resultFromBeforeStartDict.push(key);
                        }
                    }
                }
                result = result.concat(resultFromBeforeStartDict);

                if (needUniqueAndSorted) {
                    result = result
                        .filter((v, i, s) => s.indexOf(v) === i) // get unique
                        .sort(Transliterator.#alphabetOrderComparator);
                }*/
    }

    // TODO: CONFIG functionality part
    #getSourceSpecialSigns(includeOtherLangLetters) {
        const generalSpecialSigns = new Set([
            'Ъ', 'ъ', 'Ь', 'ь', "'", '’',
        ]);
        const alphabet = this.#config.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalSpecialSigns.has(l));
    }

    static #getPositionalValue(from, preIs0_midIs1_postIs2) { // для обробки можливості мати тріаду префікс-мід-пост
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

// If it's Node.js:
if (typeof window === 'undefined') {
    module.exports = Transliterator;
}