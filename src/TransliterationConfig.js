const ArrayHlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StringValueOrArrayHelpers')
    : /* browser */ StringValueOrArrayHelpers;

const ConfigHlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/ConfigHelpers')
    : /* browser */ ConfigHelpers;

const StrHlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StringUtils')
    : /* browser */ StringUtils;

// TransliterationConfigNormalize:
const ConfigNormalize = typeof window === 'undefined'
    ? /* Node.js */ require('./TransliterationConfigNormalize')
    : /* browser */ TransliterationConfigNormalize;


// TODO: expose outside unordered maps and sets, not objects and arrays

/**
 * A wrapper over a raw json config.
 * It provides a normalized config object with some additional methods.
 */
class TransliterationConfig {
    static #AFFECTING = 'affecting'; // TODO: Duplicated in TransliterationConfigNormalize.js
    static #AFFECTED = 'affected'; // TODO: Duplicated in TransliterationConfigNormalize.js
    static #UPPER_TECH_LETER = 'Ꙍ'; // TODO: Duplicated in Transliterator.js
    static #LOWER_TECH_LETER = 'ꙍ'; // TODO: Duplicated in Transliterator.js
    static #RESULT_OTHERS_KEY = "_others_";

    #wrappedConfig = null; // rename to wrappedConfigMap?
    #cache = new Map();

    /**
     * Creates a new instance of the TransliterationConfig class.
     * Takes a raw config object as a parameter and normalizes it under the hood.
     * @param rawConfig - A raw config object retrieved from a config JSON file.
     */
    constructor(rawConfig) {
        this.#wrappedConfig = {...rawConfig};
        ConfigNormalize.normalize(this.#wrappedConfig);
    }

    static get AFFECTING() { // get-only for outside
        return this.#AFFECTING;
    }

    static get AFFECTED() { // get-only for outside
        return this.#AFFECTED;
    }

    /**
     * Returns a copy of the config.
     * @returns {*}
     */
    get #configCopy() {
        return {...this.#wrappedConfig};
    }

    // TODO: make props not mutual by using configCopy?

    /**
     * Eng: The unique codename of the config.
     *
     * Ukr: Унікальний кодовий ідентифікатор конфігу.
     *
     * @returns {string}
     */
    get code() {
        return this.#wrappedConfig.code;
    }

    /**
     * Eng: The name of the config (or the transliteration variant).
     *
     * Ukr: Назва конфігу (чи варіанту латинки).
     *
     * @returns {string}
     */
    get name() {
        return this.#wrappedConfig.name;
    }

    /**
     * Eng: The description of the transliteration variant.
     *
     * Ukr: Опис цього варіанту латинки.
     *
     * @returns {string}
     */
    get desc() {
        return this.#wrappedConfig.desc;
    }

    /**
     * Eng: The link to some info about the transliteration variant.
     *
     * Ukr: Посилання на джерело інформації про цей варіант латинки.
     *
     * @returns {string}
     */
    get link() {
        return this.#wrappedConfig.link;
    }

    /**
     * Eng: The language code of the config's source language.
     *
     * Ukr: Код мови, з якої транслітерується.
     *
     * @returns {string}
     */
    get from() {
        return this.#wrappedConfig.from;
    }

    /**
     * Eng: The language code of the config's target language.
     *
     * Ukr: Код мови, на яку транслітерується.
     *
     * @returns {string}
     */
    get to() {
        return this.#wrappedConfig.to;
    }

    /**
     * Eng: Yhe year when the transliteration variant's was created.
     *
     * Ukr: Рік створення цього варіанту латинки.
     *
     * @returns {number}
     */
    get year() {
        return this.#wrappedConfig.year;
    }

    /**
     * Eng: This option tells you if you can set replacements in specific sections of the word
     * ([at the beginning, inside, at the end] 3-values array instead of a single value).
     * This option may affect performance.
     *
     * Ukr: Ця опція вказує, чи можна налаштувати заміну в конкретній частині слова
     * (трьохелементний масив [на початку, всередині, вкінці] замість одного значення).
     * Ця опція може дещо знизити продуктивність.
     *
     * @returns {boolean}
     */
    get useLocationInWordAlgo() {
        return this.#wrappedConfig.useLocationInWordAlgo;
    }

    /**
     * Eng: If `true`, the softening vowel softens the preceding consonant without changing it (сю => su̇).
     * If `false`, the softening vowel changes the previous consonant and turns into a regular vowel (сю => śu).
     *
     * Ukr: Якщо `true`, то пом'якшувальна голосна пом'якшує попередній приголосний без його зміни (сю => su̇).
     * Якщо `false` – пом'якшувальна голосна пом'якшує попередній приголосний з його зміною,
     * а сама перетворюється на звичайну голосну (сю => śu).
     *
     * @returns {boolean}
     */
    get affectVowelNotConsonantWhenSofting() {
        return this.#wrappedConfig.affectVowelNotConsonantWhenSofting;
    }

    /**
     * Eng: The basic transliteration dictionary
     * (a map of letters to their transliterated values).
     * If `useLocationInWordAlgo` is `true`, the values may be [at the beginning, inside, at the end] arrays of values.
     *
     * Ukr: Основний словник транслітерації
     * (мапа літер до їхніх транслітерованих значень).
     * Якщо `useLocationInWordAlgo` ативований, значення словника можуть бути масивами [на початку, всередині, вкінці].
     *
     * @returns {Object.<string, (string|Array.<string>)>} // TODO: use Map instead of Object
     */
    get dict() {
        return this.#wrappedConfig.dict;
    }

    /**
     * Eng: The transliteration dictionary for letters from other mutually intelligible languages
     * (a map of letters to their transliterated values).
     * If `useLocationInWordAlgo` is `true`, the values may be [at the beginning, inside, at the end] arrays of values.
     *
     * Ukr: Словник транслітерації для літер з інших схожих мов
     * (мапа літер до їхніх транслітерованих значень).
     * Якщо `useLocationInWordAlgo` ативований, значення словника можуть бути масивами [на початку, всередині, вкінці].
     *
     * @returns {Object.<string, (string|Array.<string>)>} // TODO: use Map instead of Object
     */
    get otherLanguagesLettersDict() {
        return this.#wrappedConfig.otherLanguagesLettersDict;
    }

    /**
     * Eng: The list of consonants that cannot be phonemically palatalized.
     *
     * Ukr: Перелік приголосних, які питомо для української мови не мають м'яких звуків,
     * - для них вводиться поняття фонеми периферійної підсистеми, а в основній системі вони зараз класифікуються як
     * алофони відповідних твердих фонем (http://goo.gl/pnybDn).
     *
     * @returns {Array.<string>}
     */
    get unsoftableConsonants() {
        return this.#wrappedConfig.unsoftableConsonants;
    }

    /**
     * Eng: The map of palatalized consonants to their palatalized transliterated counterparts.
     *
     * Ukr: Словник м'яких приголосних до їхніх м'яких латинських відповідників.
     *
     * @returns {Object.<string, string>}
     */
    get softableConsonantsDict() {
        return this.#wrappedConfig.softableConsonantsDict;
    }

    /**
     * Eng: A two-level map of softening vowels to their transliterated values ("affecting" and "affected")
     * when softening a consonant.
     * The "affecting" value is for cases when the consonant changes when gets palatalized, but the vowel doesn't.
     * E.g., "ćatka" ('c' changed to 'ć').
     * The "affected" value is for cases when the vowel changes when softening (but the consonant doesn't,
     * for example, when it is in the `unsoftableConsonants` list). E.g., "bjuvet" ('u' changed to 'ju').
     * If the `affectVowelNotConsonantWhenSofting` setting is `true`, the vowel will always change when softening,
     * so the "affecting" and "affected" values in this map will be the same (although, "affecting" will
     * not make much sense in this case).
     *
     * Ukr: Двохрівневий словних пом'якшувальних голосних до їхніх транслітераційних значень ("affecting" і "affected")
     * при пом'якшенні приголосної.
     * Транслітераційне значення "affecting" – для випадків, коли при помʼякшенні приголосної змінюється приголосна,
     * а голосна ні. Наприклад, "ćatka" ('c' перейшла в 'ć').
     * Транслітераційне значення "affected" – для випадків, коли при помʼякшенні приголосної змінюється голосна
     * (а приголосна ні – до прикладу, коли вона є в переліку `unsoftableConsonants`).
     * Наприклад, "bjuvet" ('u' перейшла в 'ju').
     * Якщо активоване налаштування `affectVowelNotConsonantWhenSofting` == `true`, голосна змінюватиметься завжди
     * при пом'якшенні, тому значення "affecting" і "affected" у цьому словнику співпадатимуть (хоча, "affecting"
     * в такому разі не матиме особливого сенсу).
     *
     * @returns {Object.<string, {affecting: string, affected: string}>}
     */
    get softingVowelsMultiDict() {
        return this.#wrappedConfig.softingVowelsMultiDict;
    }

    /**
     * Eng: A two-level map of softening signs to their transliterated values ("affecting" and "affected")
     * when softening a consonant.
     * The "affecting" value is for cases when the consonant changes when gets palatalized and softening sign is not
     * transliterated. E.g., "міць" => "mić" ('c' changed to 'ć', 'ь' wasn't transliterated).
     * The "affected" value is for cases when the softening sign becomes transliterated when softening (but the consonant doesn't,
     * for example, when it's in the `unsoftableConsonants` list). That's very rare and is not used in Ukrainian.
     *
     * Ukr: Двохрівневий словних пом'якшувальних знаків до їхніх транслітераційних значень ("affecting" і "affected")
     * при пом'якшенні приголосної.
     * Транслітераційне значення "affecting" – для випадків, коли при помʼякшенні приголосної змінюється приголосна,
     * а пом'якшувальний знак не транслітерується. Наприклад, "міць" => "mić" ('c' перейшла в 'ć', а мʼякий знак не транслітерувався).
     * Транслітераційне значення "affected" – для випадків, коли пом'якшувальний знак транслітерується при помʼякшенні
     * (але приголосна ні – до прикладу, коли вона є в переліку `unsoftableConsonants`). Це дуже рідкісний випадок, який
     * не використовується в українській мові.
     *
     * @returns {Object.<string, {affecting: string, affected: string}>}
     */
    get softingSignsMultiDict() {
        return this.#wrappedConfig.softingSignsMultiDict;
    }

    /**
     * Eng: The transliteration dictionary for apostrophes. The key of this map is all possible apostrophes in one string,
     * and the value is a single transliterated value for all these apostrophes. If the value is not specified, apostrophes
     * are not transliterated.
     *
     * Ukr: Словник транслітерації апострофів. Ключ цього словника – усі можливі апострофи одним рядком, а значення –
     * єдине транслітероване значення для всіх цих апострофів. Якщо значення не вказано, апострофи не транслітеруються.
     *
     * @returns {Object.<string, string>}
     */
    get apostrophesSingleKeyDict() {
        return this.#wrappedConfig.apostrophesSingleKeyDict;
    }

    /**
     * Eng: A map of already transliterated lowercase letters to their uppercase counterparts, when their pair is not
     * a standard case conversion. E.g., "d" => "Ɗ" (not "D") or "i" => "İ" (not "I").
     *
     * Ukr: Словник вже транслітерованих малих до великих літер, коли їхні пара не є сдантартним регістровим перетворенням.
     * Наприклад, "d" => "Ɗ" (не "D") чи "i" => "İ" (не "I").
     *
     * @returns {Object.<string, string>}
     */
    get exceptionalCaseRules() {
        return this.#wrappedConfig.exceptionalCaseRules;
    }

    /**
     * Eng: A map for replacing special symbols in transliteration. E.g., "№" => "No."
     *
     * Ukr: Словник для заміни спеціальних символів у траслітерації. Наприклад, "№" => "No."
     *
     * @returns {Object.<string, string>}
     */
    get specSymbolsDict() {
        return this.#wrappedConfig.specSymbolsDict;
    }

    /**
     * Eng: The substitution for undefined result.
     *
     * Ukr: Заміна для невизначеного результату.
     *
     * @returns {string}
     */
    get substitutionForUndefinedResult() {
        return this.#wrappedConfig.substitutionForUndefinedResult;
    }

    /**
     * Eng: The dictionary of replacements that should be applied at the very beginning of the transliteration algorithm.
     *
     * Ukr: Словник замін, що мають виконтися на самому початку роботи алгоритму траслітерації.
     *
     * @returns {Object.<string, string>}
     */
    get beforeStartDict() {
        return this.#wrappedConfig.beforeStartDict;
    }

    /**
     * Eng: The dictionary of clean-up replacements that should be applied at the very end of the transliteration algorithm.
     *
     * Ukr: Словник замін для остаточної підчистки, що мають виконатися на самому кінці роботи алгоритму траслітерації.
     *
     * @returns {Object.<string, string>}
     */
    get afterFinishDict() {
        return this.#wrappedConfig.afterFinishDict;
    }

    /**
     * Returns a specific property of the config.
     * @param propName - The name of the property.
     * @returns {undefined|*}
     */
    getProperty(propName) {
        if (!this.#wrappedConfig.hasOwnProperty(propName)) {
            return undefined;
        }
        return this.#configCopy[propName];
    }

    /**
     * Whether the config is empty.
     * @returns {boolean}
     */
    get isEmpty() {
        return this.#wrappedConfig != null;
    }

    /**
     * Whether the config is normalized.
     * @returns {boolean|*}
     */
    get isNormalized() {
        return this.#wrappedConfig.isNormalized; // why isNormalized is not a field of the class?
    }

    /**
     * Returns a mapping of source alphabet letters to their transliterated alphabet letters based on the current config.
     * The mapping is generated by real transliterating process, not by just getting the config's dict.
     * @param {*} transliterator - The transliterator to use for transliteration.
     * @param {boolean} ignorePositionalCases - Whether to ignore positional cases (when a letter can be transliterated differently depending on its position in a word) when generating the mapping.
     * @param {boolean} ignoreSofteningCases - Whether to ignore softening cases when generating the mapping.
     * @returns {Object} - A dictionary with pairs like { "Є є": "Je je, ie" }
     */
    getTransliterationInfo(transliterator, ignorePositionalCases = false, ignoreSofteningCases = false) {
        const cacheKey = `ConfigTransliterationInfo_${ignorePositionalCases}_${ignoreSofteningCases}`;

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetTransliterationInfo(transliterator, ignorePositionalCases, ignoreSofteningCases));
        }

        return this.#cache.get(cacheKey);
    }

    /**
     * Returns unique sorted letters of the config's source alphabet.
     * @param {boolean} getOnlyLower - Whether to return only lowercase letters.
     * @param {boolean} includeOtherLangLetters - Whether to include letters from other languages.
     * @returns {string[]} An array of unique sorted letters.
     */
    getSourceAlphabet(getOnlyLower = false, includeOtherLangLetters = false) {
        const cacheKey = `SourceAlphabet_${getOnlyLower}_${includeOtherLangLetters}`;

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetSourceAlphabet(includeOtherLangLetters));
        }

        return this.#cache.get(cacheKey);
    }

    /**
     * Returns unique sorted letters of the transliterated config's source alphabet.
     *
     * @param {*} transliterator - The transliterator to use for transliteration.
     * @param {boolean} getOnlyLower - Whether to return only lowercase letters.
     * @param {boolean} includeOtherLangLettersTransliteration - Whether to include transliteration for other language letters.
     * @returns {string[]} An array of unique sorted letters.
     */
    getTransliteratedAlphabet(transliterator, getOnlyLower = false, includeOtherLangLettersTransliteration = false) {
        const cacheKey = `TransliteratedAlphabet_${getOnlyLower}_${includeOtherLangLettersTransliteration}`;

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetTransliteratedAlphabet(transliterator, getOnlyLower, includeOtherLangLettersTransliteration));
        }

        return this.#cache.get(cacheKey);
    }

    /**
     * Returns a list of vowels from the source alphabet.
     * It includes the general Cyrillic vowels by default. If the `includeOtherLangLetters`
     * parameter is set to true, the source alphabet may also include other language's letters.
     *
     * @param {boolean} includeOtherLangLetters - Whether to include other language's letters.
     * @returns {string[]} - An array of vowels in the source alphabet.
     */
    getSourceVowels(includeOtherLangLetters = false) {
        const cacheKey = `SourceVowels_${includeOtherLangLetters}`;

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetSourceVowels(includeOtherLangLetters));
        }

        return this.#cache.get(cacheKey);
    }

    /**
     * Returns a list of consonants from the source alphabet.
     * It includes the general Cyrillic consonants by default. If the `includeOtherLangLetters`
     * parameter is set to true, the source alphabet may also include other language's letters.
     *
     * @param {boolean} includeOtherLangLetters - Whether to include other language's letters.
     * @returns {string[]} - An array of consonants in the source alphabet.
     */
    getSourceConsonants(includeOtherLangLetters = false) {
        const cacheKey = `SourceConsonants_${includeOtherLangLetters}`;

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetSourceConsonants(includeOtherLangLetters));
        }

        return this.#cache.get(cacheKey);
    }

    /**
     * Returns a list of special signs from the source alphabet.
     * It includes the general Cyrillic special signs by default. If the `includeOtherLangLetters`
     * parameter is set to true, the source alphabet may also include other language's letters.
     *
     * @param {boolean} includeOtherLangLetters - Whether to include other language's letters.
     * @returns {string[]} - An array of special signs in the source alphabet.
     */
    getSourceSpecialSigns(includeOtherLangLetters = false) {
        const cacheKey = `SourceSpecialSigns_${includeOtherLangLetters}`;

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetSourceSpecialSigns(includeOtherLangLetters));
        }

        return this.#cache.get(cacheKey);
    }

    /**
     * Returns an array of unique digraphs (specified letter combinations) from various dictionaries in the config.
     * @returns {string[]} An array of unique digraphs.
     */
    getDigraphs() {
        const cacheKey = 'Digraphs';

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetDigraphs());
        }

        return this.#cache.get(cacheKey);
    }

    // TODO: still needs some refactoring and caching
    // TODO: PROFILER: long time running
    #doGetTransliterationInfo(transliterator, ignorePositionalCases, ignoreSofteningCases) {
        const cfg = this.#wrappedConfig;

        const result = {};
        const sourceAlphabet = this.getSourceAlphabet(false, false);

        const srcVowels = new Set(this.getSourceVowels(true));
        const exemplars = this.#getSoftingExemplars(transliterator);

        const keysListIncludes = (obj, key) => obj.hasOwnProperty(key);

        for (let upr = 0, lwr = 1; upr < sourceAlphabet.length - 1; upr += 2, lwr += 2) {
            const [upper, lower] = [sourceAlphabet[upr], sourceAlphabet[lwr]];
            const currResults = [];

            if (keysListIncludes(cfg.softingSignsMultiDict, upper)) {
                // TODO: try to make pushTransliteratedResult() versatile
                //  - it's almost the same as in the other places
                const pushTransliteratedResult = (exemplar) => {
                    if (exemplar.upper.source == null || exemplar.lower.source == null) {
                        //return;
                    }

                    const res = transliterator.transliterate(`${exemplar.upper.source || ''}${upper}`)
                        + ' '
                        + transliterator.transliterate(`${exemplar.lower.source || ''}${lower}`);

                    const toRemove = [exemplar.upper.translated, exemplar.lower.translated];
                    const toPush = StrHlprs.removeLettersFromStr(res, toRemove);
                    currResults.push(toPush);

                };

                pushTransliteratedResult(exemplars.softableConsonant);
                pushTransliteratedResult(exemplars.unsoftableConsonant);

            } else {
                const toPush = transliterator.transliterate(upper) + ' ' + transliterator.transliterate(lower);
                currResults.push(toPush);

                if (!ignorePositionalCases) {
                    const midLowerRes = transliterator.transliterate(TransliterationConfig.#LOWER_TECH_LETER + lower + TransliterationConfig.#LOWER_TECH_LETER);
                    const midCaseRes = midLowerRes + ' ' + midLowerRes; // the same because it's a middle

                    const endLowerRes = transliterator.transliterate(TransliterationConfig.#LOWER_TECH_LETER + lower);
                    const endCaseRes = endLowerRes + ' ' + endLowerRes;

                    const removeTechLetters = function (str) {
                        return StrHlprs.removeLettersFromStr(str, [
                            TransliterationConfig.#UPPER_TECH_LETER,
                            TransliterationConfig.#LOWER_TECH_LETER
                        ]);
                    };

                    let toPush = removeTechLetters(midCaseRes);
                    currResults.push(toPush);

                    toPush = removeTechLetters(endCaseRes);
                    currResults.push(toPush);
                }

                if (!ignoreSofteningCases) {
                    if (srcVowels.has(upper)) {
                        const removeSofteningLetters = function (str) {
                            return StrHlprs.removeLettersFromStr(str, [
                                transliterator.transliterate(exemplars.softableConsonant.upper.source),
                                transliterator.transliterate(exemplars.softableConsonant.lower.source),
                                transliterator.transliterate(exemplars.unsoftableConsonant.upper.source),
                                transliterator.transliterate(exemplars.unsoftableConsonant.lower.source)
                            ]);
                        };

                        const pushTransliteratedResult = (exemplar) => {
                            if (exemplar.upper.source == null || exemplar.lower.source == null) {
                                return;
                            }

                            const res = transliterator.transliterate(exemplar.lower.source + lower);
                            const result = res + ' ' + res;

                            const toPush = removeSofteningLetters(result)
                            currResults.push(toPush);
                        };
                        if (cfg.affectVowelNotConsonantWhenSofting) {
                            pushTransliteratedResult(exemplars.softableConsonant);
                        }
                        pushTransliteratedResult(exemplars.unsoftableConsonant);

                    } else if (keysListIncludes(cfg.softableConsonantsDict, upper)) {
                        const pushTransliteratedResult = (exemplar) => {
                            if (exemplar.upper.source == null || exemplar.lower.source == null) {
                                return;
                            }

                            const result = transliterator.transliterate(upper + exemplar.upper.source)
                                + ' '
                                + transliterator.transliterate(lower + exemplar.lower.source);

                            const toPush = StrHlprs.removeLettersFromStr(result, [
                                exemplar.upper.translated,
                                exemplar.lower.translated]);

                            currResults.push(toPush);
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
                    = ArrayHlprs.toDiacriticless(spl[0]).length > 1 && spl[0] === StrHlprs.toUpperCase(spl[1]); // when using positional algo, some mid- and ending cases only can be fully upper-cased, not title-cased (because a word simply cannot start with it)

                return (spl.length === 2 && (areSame || firstCantBeUsedAtWordsBeginning))
                    ? spl[1] // return a single value (lower), not a pair
                    : toPush;
            };

            // at(-1) is not supported by Safari :(
            const last = (arr) => (arr == null || !arr.length) ? undefined : arr[arr.length - 1];

            result[upper + ' ' + lower] = currResults
                .filter((v, i, s) => s
                        .map(m => StrHlprs.toUpperCase(last(m.split(' '))))
                        .indexOf(StrHlprs.toUpperCase(last(v.split(' '))))
                    === i) // only with unique latest value (case insens.)
                .map(v => (v.length && v.match(/\S.*/) != null) ? v : '—') // if whitespace or empty, replace with '—'
                .map(v => transformIfNeeded(v))
                .join(', ');
        }

        const getResultWithOtherLetters = (result) => {
            const resultValuesStr = Object.values(result).join(', ');
            const otherLetters = this.getTransliteratedAlphabet(transliterator, true)
                .filter(l => !resultValuesStr.includes(l))
                .join(', '); // TODO: add uppers as well and format into pairs

            if (otherLetters.length) {
                result[TransliterationConfig.#RESULT_OTHERS_KEY] = otherLetters;
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
    #getSoftingExemplars(transliterator) {
        const cfg = this.#wrappedConfig;

        const softableUpperCon = Object.keys(cfg.softableConsonantsDict).find(v => StrHlprs.toUpperCase(v) === v);
        const softableLowerCon = Object.keys(cfg.softableConsonantsDict).find(v => StrHlprs.toLowerCase(v) === v);

        const unsoftableUpperCon = cfg.unsoftableConsonants.find(v => StrHlprs.toUpperCase(v) === v);
        const unsoftableLowerCon = cfg.unsoftableConsonants.find(v => StrHlprs.toLowerCase(v) === v);

        let softableUpperConTransed;
        let softableLowerConTransed;
        let unsoftableUpperConTransed;
        let unsoftableLowerConTransed;

        if (softableUpperCon != null && softableLowerCon != null) {
            softableUpperConTransed = ConfigHlprs.getPositionalValue_Post(cfg.softableConsonantsDict[softableUpperCon]);
            softableLowerConTransed = ConfigHlprs.getPositionalValue_Post(cfg.softableConsonantsDict[softableLowerCon]);
        }
        if (unsoftableUpperCon != null && unsoftableLowerCon != null) {
            unsoftableUpperConTransed = transliterator.transliterate(unsoftableUpperCon);
            unsoftableLowerConTransed = transliterator.transliterate(unsoftableLowerCon);
        }

        const upperSoftingSign = Object.keys(cfg.softingSignsMultiDict).find(v => StrHlprs.toUpperCase(v) === v);
        const lowerSoftingSign = Object.keys(cfg.softingSignsMultiDict).find(v => StrHlprs.toLowerCase(v) === v);

        let affectingUpperSoftingSignTransed;
        let affectingLowerSoftingSignTransed;

        if (upperSoftingSign != null && lowerSoftingSign != null) {
            affectingUpperSoftingSignTransed = ConfigHlprs.getPositionalValue_Post(cfg.softingSignsMultiDict[upperSoftingSign][TransliterationConfig.#AFFECTING]);
            affectingLowerSoftingSignTransed = ConfigHlprs.getPositionalValue_Post(cfg.softingSignsMultiDict[lowerSoftingSign][TransliterationConfig.#AFFECTING]);
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

    /**
     * Collects the source alphabet for the language, removing duplicates and sorting in alphabetical order.
     * Other languages' letters can be included or excluded based on the function argument.
     */
    #doGetSourceAlphabet(includeOtherLangLetters) {
        const cfg = this.#wrappedConfig; // TODO: get rid - use this? as in doGetTransliteratedAlphabet()

        const letterHeap = [
            cfg.unsoftableConsonants,
            ...Object.keys(cfg.softingSignsMultiDict),
            ...Object.keys(cfg.dict),
            ...Object.keys(cfg.softableConsonantsDict),
            ...Object.keys(cfg.softingVowelsMultiDict),
            ...Object.keys(cfg.beforeStartDict),
            ...(includeOtherLangLetters ? Object.keys(cfg.otherLanguagesLettersDict) : [])
        ];

        const letters = letterHeap.flatMap(el => [...el]); // flatMap for flattening letter combinations
        const uniqueLetters = [...new Set(letters)];

        // Filter out other languages' letters if not needed and sort the remaining letters.
        return uniqueLetters
            .filter(letter => includeOtherLangLetters || !cfg.otherLanguagesLettersDict.hasOwnProperty(letter))
            .sort(TransliterationConfig.alphabetOrderComparator);
    }

    #doGetTransliteratedAlphabet(transliterator, getOnlyLower, includeOtherLangLettersTransliteration) {
        // TODO: think how include substitutional letters regardless of includeOtherLangLettersTransliteration!!
        let letterHeap = [...ArrayHlprs.flattenValues(this.beforeStartDict)
            .map(val => transliterator.transliterate(val))];

        const valsToRunThruAfterFinishDict = [
            ...ArrayHlprs.flattenValues(this.dict),
            ...ArrayHlprs.flattenValues(this.apostrophesSingleKeyDict),
            ...ArrayHlprs.flattenValues(this.softableConsonantsDict),
            ...ArrayHlprs.flattenValues(this.softingVowelsMultiDict),
            ...ArrayHlprs.flattenValues(this.softingSignsMultiDict),
            ...(includeOtherLangLettersTransliteration
                ? ArrayHlprs.flattenValues(this.otherLanguagesLettersDict)
                : [])
        ];

        for (const val of valsToRunThruAfterFinishDict) {
            if (val == null) {
                continue; // should never happen (but happens – TODO: investigate)
            }

            let res = [...Object.entries(this.afterFinishDict)]
                // TODO: consider positionInWordAlgo in afterFinishDict:
                .reduce((accumulated, [afterKey, afterVal]) => accumulated.replaceAll(afterKey, afterVal), val);
            letterHeap.push(res);
        }

        letterHeap.push(...ArrayHlprs.flattenValues(this.afterFinishDict));

        const letters = letterHeap.reduce((accumulated, el) => {
            if (el == null) {
                return accumulated; // should never happen
            }

            let len = ArrayHlprs.toDiacriticless(el).length;

            if (len === 1 && (!getOnlyLower || el === StrHlprs.toLowerCase(el))) {
                return [...accumulated, el];
            }

            // add each letter separately:
            if (len > 1) {
                while (len--) {
                    accumulated.push(getOnlyLower ? StrHlprs.toLowerCase(el.charAt(len)) : el.charAt(len));
                }
            }

            return accumulated;
        }, []);

        const uniqueLetters = [...new Set(letters)];

        return uniqueLetters
            .sort(TransliterationConfig.alphabetOrderComparator);
    }


    #doGetSourceVowels(includeOtherLangLetters) {
        const generalCyrVowels = new Set([
            'А', 'а', 'Е', 'е', 'Ё', 'ё',
            'Є', 'є', 'И', 'и', 'І', 'і',
            'Ї', 'ї', 'О', 'о', 'У', 'у',
            'Ы', 'ы', 'Э', 'э', 'Ю', 'ю',
            'Я', 'я'
        ]);
        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalCyrVowels.has(l));
    }

    #doGetSourceConsonants(includeOtherLangLetters) {
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

        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalCyrConsonants.has(l));

        /*      this.#currentConfig.unsoftableConsonants.concat(Object.keys(this.#currentConfig.softableConsonantsDict));

                const resultFromBeforeStartDict = [];
                for (const con of result) {
                    const entries = Object.entries(this.#currentConfig.beforeStartDict);
                    for (const [key, vals] of entries) {
                        const valOrArr = vals;

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

    #doGetSourceSpecialSigns(includeOtherLangLetters) {
        const generalSpecialSigns = new Set([
            'Ъ', 'ъ', 'Ь', 'ь', "'", '’',
        ]);
        const alphabet = this.getSourceAlphabet(false, includeOtherLangLetters);
        return alphabet.filter(l => generalSpecialSigns.has(l));
    }

    #doGetDigraphs() {
        // TODO: do caching as in getSourceAlphabet()
        const cfg = this.#wrappedConfig;

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

        const letterHeap = dictsToGetFrom.flatMap(dict => ArrayHlprs.flattenValues(dict));

        const digraphs = letterHeap
            .filter(el => el && el.length > 1)
            .map(el => StrHlprs.toLowerCase(el));

        return [...new Set(digraphs)]; // get unique
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
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = TransliterationConfig;
} else {
    // browser:
    window.TransliterationConfig = TransliterationConfig;
}
