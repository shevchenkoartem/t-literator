const Helpers = typeof window === 'undefined'
    ? /* Node.js */ require('./string-value-or-array-helpers')
    : /* browser */ StringValueOrArrayHelpers;

const FromGitHubReader = typeof window === 'undefined'
    ? /* Node.js */ require('./default-config-reader-from-github')
    : /* browser */ DefaultConfigReaderFromGitHub;

class Transliterator {
    static #AFFECTING = 'affecting';
    static #AFFECTED = 'affected';
    #WORD_START = '【⟨'; // TODO: make static?
    #WORD_END = '⟩】';
    static #UPPER_TECH_LETER = 'Ꙍ';
    static #LOWER_TECH_LETER = 'ꙍ';

    #config = {}; // TODO: probably, would be better to cache prev. used configs and use array here + currConfigIndex
    #implementingGetConfigObject; // TODO: make this getting text, not JSON. And under the hood do JSON parsing with removing comments: txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
    #useDiacritics = true;

    constructor(implementingGetConfigObject, /*[optional]*/ cfgName) {
        this.#implementingGetConfigObject = implementingGetConfigObject != null
            ? implementingGetConfigObject
            : new FromGitHubReader();

        if (cfgName != null) {
            this.useConfig(cfgName);
        }
    }

    get config() {
        return { ...this.#config };
    }

    transliterate(txt, doNotUseDiacritic) {
        // todo: const conf = this.#config

        this.#useDiacritics = !doNotUseDiacritic; // TODO: get rid of this field
        const indexToGet = !this.#useDiacritics ? 1 : 0;

        let lat = txt;

        if (this.#config.useLocationInWordAlgo) {
            lat = this.#markStartingPositions(lat);
        }

        lat = this.#replaceAllByDict(lat,
            this.#config.beforeStartDict,
            this.#config.useLocationInWordAlgo);

        const tempApo = '⟨≀⟩';
        const apostrophesStr = Object.keys(this.#config.apostrophesSingleKeyDict)[0];
        for (const apo of apostrophesStr.split('')) {
            lat = lat.replaceAll(apo, tempApo); // To not mix real apostophes with softing ones which possibly will be added on the next step
        }

        for (const [softingVow, softingVowVals] of Object.entries(this.#config.softingVowelsMultiDict)) {
            for (const unsoftableCon of this.#config.unsoftableConsonants) {
                const softedVowVals = /*this.#config.affectVowelNotConsonantWhenSofting
                    ? softingVowVals[Transliterator.#AFFECTING]
                    : */
                    softingVowVals[Transliterator.#AFFECTED]; // when con is unsoftable, vow is forcibly soften

                if (this.#config.useLocationInWordAlgo && Array.isArray(softedVowVals[indexToGet])) {
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

            for (const [conToSoften, softedConVals] of Object.entries(this.#config.softableConsonantsDict)) {
                // TODO: consider useLocationInWordAlgo

                const conAfterSoftening = this.#config.affectVowelNotConsonantWhenSofting
                    ? conToSoften
                    : Transliterator.#getPositionalValue(softedConVals[indexToGet]);

                if (this.#config.useLocationInWordAlgo && Array.isArray(softingVowVals[Transliterator.#AFFECTING][indexToGet])) {
                    const vowAfterSofteningLocated = Transliterator.#getPositionalValue(softingVowVals[Transliterator.#AFFECTING][indexToGet], 2);
                    lat = lat.replaceAll(
                        conToSoften + softingVow + this.#WORD_END,
                        conAfterSoftening + vowAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const vowAfterSoftening = Transliterator.#getPositionalValue(softingVowVals[Transliterator.#AFFECTING][indexToGet]);
                lat = lat.replaceAll(
                    conToSoften + softingVow,
                    conAfterSoftening + vowAfterSoftening
                );
            }
        }

        for (const [softingSign, softingSignSubDict] of Object.entries(this.#config.softingSignsMultiDict)) {
            for (const unsoftableCon of this.#config.unsoftableConsonants) {
                // TODO: think (and see prev. sample if needed)
                // TODO: consider useLocationInWordAlgo!!!
                lat = lat.replaceAll(
                    unsoftableCon + softingSign,
                    unsoftableCon + softingSignSubDict[Transliterator.#AFFECTED][indexToGet]
                );
            }

            for (const [conToSoften, softedConVals] of Object.entries(this.#config.softableConsonantsDict)) {
                // TODO: consider useLocationInWordAlgo, recheck

                const conAfterSoftening = Transliterator.#getPositionalValue(softedConVals[indexToGet]);

                if (this.#config.useLocationInWordAlgo && Array.isArray(softingSignSubDict[Transliterator.#AFFECTING][indexToGet])) {
                    const softingSignAfterSofteningLocated = Transliterator.#getPositionalValue(softingSignSubDict[Transliterator.#AFFECTING][indexToGet], 2);
                    lat = lat.replaceAll(
                        conToSoften + softingSign + this.#WORD_END,
                        conAfterSoftening + softingSignAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const softingSignAfterSoftening = Transliterator.#getPositionalValue(softingSignSubDict[Transliterator.#AFFECTING][indexToGet]);
                lat = lat.replaceAll(
                    conToSoften + softingSign,
                    conAfterSoftening + softingSignAfterSoftening
                );
            }

            lat = lat.replaceAll(softingSign, softingSignSubDict[Transliterator.#AFFECTED][indexToGet]); // if softing sign is used unexpectedly
        }

        lat = lat.replaceAll(tempApo, this.#config.apostrophesSingleKeyDict[apostrophesStr]); // Replace apostrophes

        lat = this.#replaceAllByDict(lat, this.#config.dict, this.#config.useLocationInWordAlgo); // todo check last params inside the method instead passing
        lat = this.#replaceAllByDict(lat, this.#config.otherLanguagesLettersDict, this.#config.useLocationInWordAlgo);
        lat = this.#replaceAllByDict(lat, this.#config.specSymbolsDict, this.#config.useLocationInWordAlgo);

        if (this.#config.useLocationInWordAlgo) {
            lat = lat.replaceAll(this.#WORD_START, '');
            lat = lat.replaceAll(this.#WORD_END, '');
        }

        lat = this.#detectAndFixCapsLocked(lat);

        lat = this.#replaceAllByDict(lat, this.#config.afterFinishDict, this.#config.useLocationInWordAlgo);

        if (this.#config.substitutionForUndefinedResult != null) {
            lat = lat.replaceAll('undefined', this.#config.substitutionForUndefinedResult);
        }

        return lat;
    }

    useConfig(cfgName) {
        this.#config = { ...this.#implementingGetConfigObject.getConfigObject(cfgName) };
        this.#ensureConfigCompleted();
    }

    // TODO: it DOES NEED refactoring!
    getConfigTransliterationInfo(ignorePositionalCases, ignoreSofteningCases) {
        const result = {};
        const sourceAlphabet = this.getSourceAlphabet(false, false);
        const indexToGet = !this.#useDiacritics ? 1 : 0;

        const softableUpperCon = Object.keys(this.#config.softableConsonantsDict).find(v => v.toLocaleUpperCase() === v);
        const softableLowerCon = Object.keys(this.#config.softableConsonantsDict).find(v => v.toLocaleLowerCase() === v);
        const unsoftableUpperCon = this.#config.unsoftableConsonants.find(v => v.toLocaleUpperCase() === v);
        const unsoftableLowerCon = this.#config.unsoftableConsonants.find(v => v.toLocaleLowerCase() === v);

        let softableUpperConTransed;
        let softableLowerConTransed;
        let unsoftableUpperConTransed;
        let unsoftableLowerConTransed;

        if (softableUpperCon != null && softableLowerCon != null) {
            softableUpperConTransed = Transliterator.#getPositionalValue(this.#config.softableConsonantsDict[softableUpperCon][indexToGet], 2);
            softableLowerConTransed = Transliterator.#getPositionalValue(this.#config.softableConsonantsDict[softableLowerCon][indexToGet], 2);
        }
        if (unsoftableUpperCon != null && unsoftableLowerCon != null) {
            unsoftableUpperConTransed = this.transliterate(unsoftableUpperCon);
            unsoftableLowerConTransed = this.transliterate(unsoftableLowerCon);
        }

        // TODO: make using the same upperCase function with the same args everywhere (better to create a method)
        const upperSoftingSign = Object.keys(this.#config.softingSignsMultiDict).find(v => v.toLocaleUpperCase() === v);
        const lowerSoftingSign = Object.keys(this.#config.softingSignsMultiDict).find(v => v.toLocaleLowerCase() === v);
        let affectingUpperSoftingSignTransed;
        let affectingLowerSoftingSignTransed;

        if (upperSoftingSign != null && lowerSoftingSign != null) {
            affectingUpperSoftingSignTransed = Transliterator.#getPositionalValue(this.#config.softingSignsMultiDict[upperSoftingSign][Transliterator.#AFFECTING][indexToGet], 2);
            affectingLowerSoftingSignTransed = Transliterator.#getPositionalValue(this.#config.softingSignsMultiDict[lowerSoftingSign][Transliterator.#AFFECTING][indexToGet], 2);
        }

        const srcVowels = this.#getSourceVowels(true);

        for (let upr = 0, lwr = 1; upr < sourceAlphabet.length - 1; upr += 2, lwr += 2) {
            const upper = sourceAlphabet[upr];
            const lower = sourceAlphabet[lwr];
            const currResults = [];

            if (Object.keys(this.#config.softingSignsMultiDict).includes(upper)) {
                const softableRes = this.transliterate(softableUpperCon + upper)
                    + ' '
                    + this.transliterate(softableLowerCon + lower);

                let toPush = softableRes.replaceAll(softableUpperConTransed, '').replaceAll(softableLowerConTransed, '');
                currResults.push(toPush);

                const unsoftableRes = this.transliterate(unsoftableUpperCon + upper)
                    + ' '
                    + this.transliterate(unsoftableLowerCon + lower);

                toPush = unsoftableRes.replaceAll(unsoftableUpperConTransed, '').replaceAll(unsoftableLowerConTransed, '');
                currResults.push(toPush);

            } else {
                const toPush = this.transliterate(upper) + ' ' + this.transliterate(lower);
                currResults.push(toPush);

                if (!ignorePositionalCases) {
                    const midLowerRes = this.transliterate(Transliterator.#LOWER_TECH_LETER + lower + Transliterator.#LOWER_TECH_LETER);
                    const midCaseRes = midLowerRes + ' ' + midLowerRes; // the same because it's a middle

                    const endLowerRes = this.transliterate(Transliterator.#LOWER_TECH_LETER + lower);
                    const endCaseRes = endLowerRes + ' ' + endLowerRes;

                    const removeTechLetters = function (str) {
                        return str
                            .replaceAll(Transliterator.#UPPER_TECH_LETER, '')
                            .replaceAll(Transliterator.#LOWER_TECH_LETER, '');
                    };

                    let toPush = removeTechLetters(midCaseRes);
                    currResults.push(toPush);

                    toPush = removeTechLetters(endCaseRes);
                    currResults.push(toPush);
                }

                if (!ignoreSofteningCases) {
                    if (srcVowels.includes(upper)) {
                        const that = this;
                        const removeSofteningLetters = function (str) {
                            return str
                                .replaceAll(that.transliterate(softableUpperCon), '')
                                .replaceAll(that.transliterate(softableLowerCon), '')
                                .replaceAll(that.transliterate(unsoftableUpperCon), '')
                                .replaceAll(that.transliterate(unsoftableLowerCon), '');
                        };

                        if (this.#config.affectVowelNotConsonantWhenSofting && softableUpperCon != null && softableLowerCon != null) {

                            const sRes = this.transliterate(softableLowerCon + lower);
                            const softableRes = sRes + ' ' + sRes;

                            const toPush = removeSofteningLetters(softableRes);
                            currResults.push(toPush);
                        }

                        if (unsoftableUpperCon != null && unsoftableLowerCon != null) {
                            const uRes = this.transliterate(unsoftableLowerCon + lower);
                            const unsoftableRes = uRes + ' ' + uRes;

                            const toPush = removeSofteningLetters(unsoftableRes);
                            currResults.push(toPush);
                        }
                    } else if (Object.keys(this.#config.softableConsonantsDict).includes(upper)) {
                        if (upperSoftingSign != null && lowerSoftingSign != null) {
                            const softedRes = this.transliterate(upper + upperSoftingSign)
                                + ' '
                                + this.transliterate(lower + lowerSoftingSign);

                            const toPush = softedRes
                                .replaceAll(affectingUpperSoftingSignTransed, '')
                                .replaceAll(affectingLowerSoftingSignTransed, '');

                            currResults.push(toPush);
                        }

                        if (!ignorePositionalCases) {
                            // TODO: think if it's ever needed at all - positional softed cases
                        }
                    } else {
                        // no need to soften
                    }
                }
            }

            const transformIfNeeded = function (toPush) {
                const spl = toPush.split(' ');

                if (spl.length === 2) {
                    const areSame = spl[0] === spl[1]; // e.g. both are apostrophes: "' '"
                    const firstCantBeUsedAtWordsBeginning = Helpers.toDiacriticless(spl[0]).length > 1 && spl[0] === spl[1].toLocaleUpperCase(); // when using positional algo, some mid- and ending cases only can be fully upper-cased, not title-cased (because a word simply cannot start with it)

                    if (areSame || firstCantBeUsedAtWordsBeginning) {
                        return spl[1]; // return a single value (lower), not a pair
                    }
                }

                return toPush;
            };

            result[upper + ' ' + lower] = currResults
                .filter((v, i, s) => s
                    .map(m => m.split(' ').at(-1).toLocaleUpperCase())
                    .indexOf(v.split(' ').at(-1).toLocaleUpperCase())
                    === i) // only with unique latest value (case insens.)
                .map(v => (v.length && v.match(/\S.*/) != null) ? v : '—') // if whitespaced or empty - replace with '—'
                .map(v => transformIfNeeded(v))
                .join(', ');
        }

        const resultValsStr = Object.values(result).join(', ');
        const otherLetters = this.getTransliteratedAlphabet(true)
            .filter(l => !resultValsStr.includes(l))
            .join(', '); // todo: add uppers as well and format into pairs

        if (otherLetters.length) {
            result["_others_"] = otherLetters; // todo: make const
        }
        return result;
    }

    getSourceAlphabet(getOnlyLower, includeOtherLangLetters) {
        const letterHeap = this.#config.unsoftableConsonants
            .concat(Object.keys(this.#config.softingSignsMultiDict))
            .concat(Object.keys(this.#config.dict))
            .concat(Object.keys(this.#config.softableConsonantsDict))
            .concat(Object.keys(this.#config.softingVowelsMultiDict))
            .concat(Object.keys(this.#config.beforeStartDict))
            .concat(includeOtherLangLetters ? Object.keys(this.#config.otherLanguagesLettersDict) : []);

        const letters = [];
        for (const el of letterHeap) {
            let len = el.length;

            if (len === 1) {
                letters.push(getOnlyLower ? el.toLowerCase() : el);
                continue;
            }

            // add each letter separately:
            if (len > 1) {
                while (len--) {
                    letters.push(getOnlyLower
                        ? el.charAt(len).toLowerCase()
                        : el.charAt(len));
                }
            }
        }

        return letters
            .filter((v, i, s) => s.indexOf(v) === i) // get unique
            .filter(v => !includeOtherLangLetters // get rid of other languages' letters (if needed)
                ? !Object.keys(this.#config.otherLanguagesLettersDict).includes(v)
                : true)
            .sort(Transliterator.#alphabetOrderComparator);
    }

    // TODO: think how include substitutional letters regardless of includeOtherLangLettersTransliteration!!
    getTransliteratedAlphabet(getOnlyLower, includeOtherLangLettersTransliteration) {
        let letterHeap = [...this.#flatValuesAt(this.#config.beforeStartDict).map(val =>
            this.transliterate(val))]; // TODO: refactor others places to use map(), filter() and others

        const valsToRunThruAfterFinishDict = this.#flatValuesAt(this.#config.dict)
            .concat(this.#flatValuesAt(this.#config.apostrophesSingleKeyDict))
            .concat(this.#flatValuesAt(this.#config.softableConsonantsDict))
            .concat(this.#flatValuesAt(this.#config.softingVowelsMultiDict))
            .concat(this.#flatValuesAt(this.#config.softingSignsMultiDict))
            .concat(includeOtherLangLettersTransliteration ? this.#flatValuesAt(this.#config.otherLanguagesLettersDict) : []);

        for (const val of valsToRunThruAfterFinishDict) {
            if (val == null) { // it shouldn't happen
                continue;
            }

            let res = val;
            for (const [afterKey, afterVal] of Object.entries(this.#config.afterFinishDict)) {
                res = res.replaceAll(afterKey, afterVal); // TODO: consider positionInWordAlgo in afterFinishDict
            }
            letterHeap.push(res);
        }

        letterHeap = letterHeap.concat(this.#flatValuesAt(this.#config.afterFinishDict));

        const letters = [];
        for (const el of letterHeap) {
            if (el == null) { // it shouldn't happen
                continue;
            }

            let len = Helpers.toDiacriticless(el).length;

            if (len === 1) {
                if (!getOnlyLower || el === el.toLowerCase()) {
                    letters.push(el);
                }
                continue;
            }

            // add each letter separately:
            if (len > 1) {
                while (len--) {
                    letters.push(getOnlyLower
                        ? el.charAt(len).toLowerCase()
                        : el.charAt(len));
                }
            }
        }

        return letters
            .filter((v, i, s) => s.indexOf(v) === i)  // get unique
            .sort(Transliterator.#alphabetOrderComparator);
    }

    // TODO /* test, rethink collections */
    #getDigraphs() {
        const letterHeap = this.#flatValuesAt(this.#config.beforeStartDict)
            .concat(this.#flatValuesAt(this.#config.dict))
            .concat(this.#flatValuesAt(this.#config.apostrophesSingleKeyDict))
            .concat(this.#flatValuesAt(this.#config.softableConsonantsDict))
            .concat(this.#flatValuesAt(this.#config.softingVowelsMultiDict))
            .concat(this.#flatValuesAt(this.#config.softingSignsMultiDict))
            .concat(this.#flatValuesAt(this.#config.otherLanguagesLettersDict))
            .concat(this.#flatValuesAt(this.#config.afterFinishDict));

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

    #ensureConfigCompleted() {
        this.#config.code = this.#config.code ?? 'code' + Math.floor(Math.random() * 1000);
        this.#config.name = this.#config.name ?? 'Unnamed';
        this.#config.desc = this.#config.desc ?? '';
        this.#config.link = this.#config.link ?? '';
        this.#config.from = this.#config.from ?? '';
        this.#config.to = this.#config.to ?? '';
        this.#config.exceptionalCaseRules = this.#config.exceptionalCaseRules ?? {};
        ///this.#config.year = this.#config.year ?? -1;
        ////this.#config.substitutionForErrors = this.#config.substitutionForErrors ?? '';

        this.#config.affectVowelNotConsonantWhenSofting =
            this.#config.affectVowelNotConsonantWhenSofting ?? false;
        this.#config.useLocationInWordAlgo = this.#config.useLocationInWordAlgo ?? false;

        // arrs:
        this.#config.unsoftableConsonants = this.#config.unsoftableConsonants ?? [];
        // dicts:
        this.#config.softableConsonantsDict = Transliterator.#getNormalizedDictStructure(this.#config.softableConsonantsDict);
        this.#config.dict = Transliterator.#getNormalizedDictStructure(this.#config.dict);
        this.#config.otherLanguagesLettersDict = Transliterator.#getNormalizedDictStructure(this.#config.otherLanguagesLettersDict);
        this.#config.specSymbolsDict = Transliterator.#getNormalizedDictStructure(this.#config.specSymbolsDict);
        this.#config.beforeStartDict = Transliterator.#getNormalizedDictStructure(this.#config.beforeStartDict);
        this.#config.afterFinishDict = Transliterator.#getNormalizedDictStructure(this.#config.afterFinishDict);
        // multidicts:
        this.#config.softingSignsMultiDict = Transliterator.#getNormalizedMultiDictStructure(this.#config.softingSignsMultiDict);
        this.#config.softingVowelsMultiDict = Transliterator.#getNormalizedMultiDictStructure(this.#config.softingVowelsMultiDict);
        // single key dicts:
        this.#normalizeApostrophesSingleKeyDict();

        // beforeStartDict uses it's own rules:
        Transliterator.#completeByUpperAndTitleCased(this.#config.beforeStartDict);
        if (!this.#useDiacritics) {
            Transliterator.#completeByNonDiacritics(this.#config.beforeStartDict, true);
        }

        const cols = [
            // arrs:
            this.#config.unsoftableConsonants,

            // dicts/multidicts:
            this.#config.softableConsonantsDict,
            this.#config.dict,
            this.#config.otherLanguagesLettersDict,
            this.#config.softingSignsMultiDict,
            this.#config.softingVowelsMultiDict,
            ////this.#config.specSymbolsDict,
            ////this.#config.beforeStartDict,
            this.#config.afterFinishDict
        ];

        for (const col of cols) {
            Transliterator.#completeByUpperAndTitleCased(col);

            if (!this.#useDiacritics) {
                Transliterator.#completeByNonDiacritics(col);
            }
        }
    }

    #markStartingPositions(txt) {
        const letters = this.getSourceAlphabet(false, true)
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

    // Fixes uppercased issues, e.g. "ЩУКА"->"ŠčUKA" to "ŠČUKA"  
    #detectAndFixCapsLocked(txt, onceAgain) {
        let res = txt;

        // IssueAFTER or BEFOREIssue (a(1), b(2), c(3) and d(4) groups respectively)
        const pattern = /(?<a>\p{Lu}\p{Ll}+)(?<b>\p{Lu}+)|(?<c>\p{Lu}+)(?<d>\p{Lu}\p{Ll}+)/gu;
        const matches = [...res.matchAll(pattern)];

        const mappedMatches = matches.map(m => ({
            probablyIssue: m[1] != null ? m[1] : m[4],
            after: m[2] != null ? m[2] : '',
            before: m[3] != null ? m[3] : '',
            index: m.index
        }));

        const digraphs = this.#getDigraphs(); // TODO прочистити від шлаку

        for (const m of mappedMatches) {
            if (digraphs.includes(m.probablyIssue.toLowerCase())) {
                const replaceAt = (str, index, replacement) =>
                    str.substr(0, index)
                    + replacement
                    + str.substr(index + replacement.length);

                res = replaceAt(res, m.index, m.before + m.probablyIssue.toUpperCase() + m.after);
            }
        }

        return onceAgain
            ? res
            : this.#detectAndFixCapsLocked(res, true); // run twice for better results
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

    #normalizeApostrophesSingleKeyDict() {
        let keys;
        if (this.#config.apostrophesSingleKeyDict != null) {
            keys = Object.keys(this.#config.apostrophesSingleKeyDict);
        }

        if (keys == null || !keys.length) {
            this.#config.apostrophesSingleKeyDict = { "": "" };
        } else {
            let i = 0;
            // ensure dict has a single key:
            keys.forEach((key) =>
                i++ === 0 || delete this.#config.apostrophesSingleKeyDict[key]);
        }
    }

    //TODO: rethink name:
    #flatValuesAt(obj) {
        const indexToGet = !this.#useDiacritics ? 1 : 0;
        return Object.values(obj).flatMap(val =>
            val.constructor === Object
                ? this.#flatValuesAt(val)
                : val[indexToGet]);
    }

    #getSourceVowels(includeOtherLangLetters) {
        const generalCyrVowels = [ // TODO: make lower string
            'А', 'а', 'Е', 'е', 'Ё', 'ё',
            'Є', 'є', 'И', 'и', 'І', 'і',
            'Ї', 'ї', 'О', 'о', 'У', 'у',
            'Ы', 'ы', 'Э', 'э', 'Ю', 'ю',
            'Я', 'я'
        ];
        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalCyrVowels.includes(l));
    }

    #getSourceConsonants(includeOtherLangLetters) {
        const generalCyrConsonants = [ // TODO: make lower string
            'Б', 'б', 'В', 'в', 'Г', 'г', 'Ґ', 'ґ', 'Д',
            'д', 'Ѓ', 'ѓ', 'Ђ', 'ђ', 'Ж', 'ж', 'З', 'з',
            'З́', 'з́', 'Ѕ', 'ѕ', 'Й', 'й', 'Ј', 'ј', 'К',
            'к', 'Л', 'л', 'Љ', 'љ', 'М', 'м', 'Н', 'н',
            'Њ', 'њ', 'П', 'п', 'Р', 'р', 'С', 'с', 'С́',
            'с́', 'Т', 'т', 'Ћ', 'ћ', 'Ќ', 'ќ', 'Ў', 'ў',
            'Ф', 'ф', 'Х', 'х', 'Ц', 'ц', 'Ч', 'ч', 'Џ',
            'џ', 'Ш', 'ш', 'Щ', 'щ'
        ];

        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalCyrConsonants.includes(l));

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

    #getSourceSpecialSigns(includeOtherLangLetters) {
        const generalSpecialSigns = [ // TODO: make lower string
            'Ъ', 'ъ', 'Ь', 'ь', "'", '’',
        ];
        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalSpecialSigns.includes(l));
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
                affectionDict[Transliterator.#AFFECTED] = valOrArr;
                affectionDict[Transliterator.#AFFECTING] = valOrArr;

                res[key] = Transliterator.#getNormalizedDictStructure(affectionDict);
            } else {
                res[key] = Transliterator.#getNormalizedDictStructure(multiDict[key]);
            }
        }

        return res;
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

    /// If the second (non-diacritics) value/array in the dictOfArrs
    /// hasn't been set – let's copy it without diacritics.
    static #completeByNonDiacritics(/*[ref]*/dictOfArrsOrMulti, doNotForce) { // TODO: use last arg level upper
        if (dictOfArrsOrMulti.constructor !== Object) {
            return;
        }

        for (const arrOrAffectionDict of Object.values(dictOfArrsOrMulti)) {
            if (arrOrAffectionDict.constructor === Object) {
                // affection dict, use recursive call:
                Transliterator.#completeByNonDiacritics(arrOrAffectionDict);
                continue;
            }

            if (!arrOrAffectionDict.length) {
                continue; // it shouldn't happen
            }

            if (arrOrAffectionDict.length === 1) {
                // Copy second one from the first one:
                arrOrAffectionDict.push(Helpers.toDiacriticless(arrOrAffectionDict[0]));
            } else if (!doNotForce) { // arr.length > 1 and forced mode
                arrOrAffectionDict[1] = Helpers.toDiacriticless(arrOrAffectionDict[1]); // forced mode: ensure given second value doesn't have diacritics
            } else {
                // do nothing;
            }
        }
    }

    static #completeByUpperAndTitleCased(/*[ref]*/arrOrDictOrMulti) {
        const toCaseFuncs = [
            Helpers.toTitleCase,
            Helpers.toUpperCase
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

    static #alphabetOrderComparator(a, b) {
        const shouldBeLast = '\'’*';
        let signChanger = 1;

        if (shouldBeLast.includes(a) && !shouldBeLast.includes(b) ||
            shouldBeLast.includes(b) && !shouldBeLast.includes(a)) {
            signChanger = -1;
        }

        const specialGroupOrders = [
            'AaȦȧÄä',
            'EeĖėËë',
            'IıİiÏï',
            'OoȮȯÖö',
            'UuU̇u̇Üü',
            'YyẎẏŸÿ'
        ];

        for (const group of specialGroupOrders) {
            if (group.includes(a) || group.includes(b)) {
                if (group.includes(a) && group.includes(b)) {
                    return group.indexOf(a).toString()
                        .localeCompare(group.indexOf(b).toString());
                } else if (group.includes(a)) {
                    a = group[0];
                    break;
                } else {
                    b = group[0];
                    break;
                }
            }
        }

        return signChanger * a.localeCompare(b, 'uk', { caseFirst: 'upper' });
    }
}

// If it's Node.js:
if (typeof window === 'undefined') { module.exports = Transliterator; }