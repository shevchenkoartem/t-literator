const NormalizedConfig = typeof window === 'undefined'
    ? /* Node.js */ require('./normalized-config')
    : /* browser */ NormalizedConfig;

const ConfigsCollection = typeof window === 'undefined'
    ? /* Node.js */ require('./configs-collection')
    : /* browser */ ConfigsCollection;

const Helpers = typeof window === 'undefined'
    ? /* Node.js */ require('./string-value-or-array-helpers')
    : /* browser */ StringValueOrArrayHelpers;

const FromGitHubReader = typeof window === 'undefined'
    ? /* Node.js */ require('./default-config-reader-from-github')
    : /* browser */ DefaultConfigReaderFromGitHub;

class Transliterator {
    #WORD_START = '【⟨'; // TODO: make static?
    #WORD_END = '⟩】';
    static #UPPER_TECH_LETER = 'Ꙍ';
    static #LOWER_TECH_LETER = 'ꙍ';

    #config = {};
    #configsCache = {};
    #implementingGetConfigObject; // TODO: make this getting text, not JSON. And under the hood do JSON parsing with removing comments: txt.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
    
    #useDiacritics = true; //TODO: get rid of it

    constructor(/*[optional]*/ rawConfigsOrImplementingGetConfigObject, /*[optional]*/ cfgName) {
        let useDefGetConfigObject = false;
        let rawConfigsToInitialize = [];
        
        if (rawConfigsOrImplementingGetConfigObject == null) {
            useDefGetConfigObject = true;
        } else if(!Array.isArray(rawConfigsOrImplementingGetConfigObject)) {
            // specific implementingGetConfigObject is passed:
            this.#implementingGetConfigObject = rawConfigsOrImplementingGetConfigObject;
        } else {
            // raw configs array is passed:
            rawConfigsToInitialize = rawConfigsOrImplementingGetConfigObject;
            useDefGetConfigObject = true;
        }

        if (useDefGetConfigObject) {
            this.#implementingGetConfigObject = new FromGitHubReader();
        }

        this.#configsCache = new ConfigsCollection(rawConfigsToInitialize);

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
                    ? softingVowVals[NormalizedConfig.AFFECTING]
                    : */
                    softingVowVals[NormalizedConfig.AFFECTED]; // when con is unsoftable, vow is forcibly soften

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

                if (this.#config.useLocationInWordAlgo && Array.isArray(softingVowVals[NormalizedConfig.AFFECTING][indexToGet])) {
                    const vowAfterSofteningLocated = Transliterator.#getPositionalValue(softingVowVals[NormalizedConfig.AFFECTING][indexToGet], 2);
                    lat = lat.replaceAll(
                        conToSoften + softingVow + this.#WORD_END,
                        conAfterSoftening + vowAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const vowAfterSoftening = Transliterator.#getPositionalValue(softingVowVals[NormalizedConfig.AFFECTING][indexToGet]);
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
                    unsoftableCon + softingSignSubDict[NormalizedConfig.AFFECTED][indexToGet]
                );
            }

            for (const [conToSoften, softedConVals] of Object.entries(this.#config.softableConsonantsDict)) {
                // TODO: consider useLocationInWordAlgo, recheck

                const conAfterSoftening = Transliterator.#getPositionalValue(softedConVals[indexToGet]);

                if (this.#config.useLocationInWordAlgo && Array.isArray(softingSignSubDict[NormalizedConfig.AFFECTING][indexToGet])) {
                    const softingSignAfterSofteningLocated = Transliterator.#getPositionalValue(softingSignSubDict[NormalizedConfig.AFFECTING][indexToGet], 2);
                    lat = lat.replaceAll(
                        conToSoften + softingSign + this.#WORD_END,
                        conAfterSoftening + softingSignAfterSofteningLocated + this.#WORD_END
                    );
                    // TODO: + beginning with softed
                }

                const softingSignAfterSoftening = Transliterator.#getPositionalValue(softingSignSubDict[NormalizedConfig.AFFECTING][indexToGet]);
                lat = lat.replaceAll(
                    conToSoften + softingSign,
                    conAfterSoftening + softingSignAfterSoftening
                );
            }

            lat = lat.replaceAll(softingSign, softingSignSubDict[NormalizedConfig.AFFECTED][indexToGet]); // if softing sign is used unexpectedly
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

    useConfig(cfgCode) {
        if (this.#config.code === cfgCode) { 
            return; 
        }
        
        if (!this.#configsCache.hasConfig(cfgCode)) {
            const cfg = this.#implementingGetConfigObject.getConfigObject(cfgCode);
            this.#configsCache.upsertConfig(cfg);
        }

        this.#config = this.#configsCache.getConfig(cfgCode);
    }

    // TODO: kind of CONFIG functionality part
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
            affectingUpperSoftingSignTransed = Transliterator.#getPositionalValue(this.#config.softingSignsMultiDict[upperSoftingSign][NormalizedConfig.AFFECTING][indexToGet], 2);
            affectingLowerSoftingSignTransed = Transliterator.#getPositionalValue(this.#config.softingSignsMultiDict[lowerSoftingSign][NormalizedConfig.AFFECTING][indexToGet], 2);
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

            // at(-1) is not supported by Safari :(
            const last = (arr) => (arr == null || !arr.length) ? undefined : arr[arr.length - 1];

            result[upper + ' ' + lower] = currResults
                .filter((v, i, s) => s
                    .map(m => last(m.split(' ')).toLocaleUpperCase())
                    .indexOf(last(v.split(' ')).toLocaleUpperCase())
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

    // TODO: CONFIG functionality part
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

    // TODO: CONFIG functionality part
    // TODO: think how include substitutional letters regardless of includeOtherLangLettersTransliteration!!
    getTransliteratedAlphabet(getOnlyLower, includeOtherLangLettersTransliteration) {
        const dontUseDiacritics = false; // !this.#useDiacritics todo: get rid of #useDiacritics!
        let letterHeap = [...Helpers.flatValuesAt(this.#config.beforeStartDict, dontUseDiacritics).map(val =>
            this.transliterate(val))]; // TODO: refactor others places to use map(), filter() and others

        const valsToRunThruAfterFinishDict = Helpers.flatValuesAt(this.#config.dict, dontUseDiacritics)
            .concat(Helpers.flatValuesAt(this.#config.apostrophesSingleKeyDict, dontUseDiacritics))
            .concat(Helpers.flatValuesAt(this.#config.softableConsonantsDict, dontUseDiacritics))
            .concat(Helpers.flatValuesAt(this.#config.softingVowelsMultiDict, dontUseDiacritics))
            .concat(Helpers.flatValuesAt(this.#config.softingSignsMultiDict, dontUseDiacritics))
            .concat(includeOtherLangLettersTransliteration ? Helpers.flatValuesAt(this.#config.otherLanguagesLettersDict, dontUseDiacritics) : []);

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
        
        letterHeap = letterHeap.concat(Helpers.flatValuesAt(this.#config.afterFinishDict, dontUseDiacritics));

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
    #detectAndFixCapsLocked(txt, repeatTimesLeft) {
        let res = txt;
        repeatTimesLeft = repeatTimesLeft ?? 2;

        // IssueAFTER or BEFOREIssue (a(1), b(2), c(3) and d(5) groups respectively)
        // TODO q - for apostrophes todo append first OR and other spec symbols
        const groupIdx = {              
            a: 1,
            b: 2,
            c: 3,
            q: 4,
            d: 5
        };
        
        const pattern = /(?<a>\p{Lu}\p{Ll}+)(?<b>\p{Lu}+)|(?<c>\p{Lu}+)(?<q>['"]*)(?<d>\p{Lu}\p{Ll}+)/gu;
        const matches = [...res.matchAll(pattern)];

        const mappedMatches = matches.map(m => ({
            probablyIssue: m[groupIdx.a] != null ? m[groupIdx.a] : m[groupIdx.d],
            after: m[groupIdx.b] != null ? m[groupIdx.b] : '',
            before: m[groupIdx.c] != null ? m[groupIdx.c] : '',
            specSymb2: m[groupIdx.q] != null ? m[groupIdx.q] : '',
            index: m.index
        }));

        const digraphs = this.#config.getDigraphs();

        for (const m of mappedMatches) {
            if (digraphs.includes(m.probablyIssue.toLowerCase())) {
                const replaceAt = (str, index, replacement) =>
                    str.substr(0, index)
                    + replacement
                    + str.substr(index + replacement.length);

                res = replaceAt(res, m.index, m.before + m.specSymb2 + Helpers.toUpperCase(m.probablyIssue, this.#config.exceptionalCaseRules) + m.after);
            }
        }

        return repeatTimesLeft === 0
            ? res
            : this.#detectAndFixCapsLocked(res, repeatTimesLeft - 1); // run several times for better results
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

    // TODO: CONFIG functionality part
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

    // TODO: CONFIG functionality part
    #getSourceSpecialSigns(includeOtherLangLetters) {
        const generalSpecialSigns = [ // TODO: make lower string
            'Ъ', 'ъ', 'Ь', 'ь', "'", '’',
        ];
        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalSpecialSigns.includes(l));
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