const Hlprs = typeof window === 'undefined'
    ? /* Node.js */ require('./helpers/StringValueOrArrayHelpers')
    : /* browser */ StringValueOrArrayHelpers;

// TODO: expose outside unordered maps and sets, not objects and arrays

/**
 * A wrapper over a raw json config.
 * It provides a normalized config object with some additional methods.
 */
class TransliterationConfig {
    static #UNSUPPORTED_NON_DIACRITIC_VALUES_MSG = "Previously supported non-diacritic values are deprecated";
    static #AFFECTING = 'affecting';
    static #AFFECTED = 'affected';

    #wrappedConfig = null; // rename to wrappedConfigMap?
    #cache = new Map();

    /**
     * Creates a new instance of the TransliterationConfig class.
     * Takes a raw config object as a parameter and normalizes it under the hood.
     * @param rawConfig - A raw config object retrieved from a config JSON file.
     */
    constructor(rawConfig) {
        this.#wrappedConfig = {...rawConfig};
        this.#ensureNormalized();
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
     * Returns unique sorted letters of the config's source alphabet.
     * @param {boolean} getOnlyLower - Whether to return only lowercase letters.
     * @param {boolean} includeOtherLangLetters - Whether to include letters from other languages.
     * @returns {string[]} An array of unique sorted letters.
     */
    getSourceAlphabet(getOnlyLower, includeOtherLangLetters) {
        const cacheKey = includeOtherLangLetters
            ? 'SourceAlphabetWithOtherLangLetters'
            : 'SourceAlphabetWithoutOtherLangLetters';

        if (!this.#cache.has(cacheKey)) {
            this.#cache.set(cacheKey, this.#doGetSourceAlphabet(includeOtherLangLetters));
        }

        const alphabet = this.#cache.get(cacheKey);
        return getOnlyLower ? this.#makeLowerAlphabet(alphabet) : alphabet;
    }

    /**
     * Returns a list of vowels from the source alphabet.
     * It includes the general Cyrillic vowels by default. If the `includeOtherLangLetters`
     * parameter is set to true, the source alphabet may also include other language's letters.
     *
     * @param {boolean} includeOtherLangLetters - Whether to include other language's letters.
     * @returns {string[]} - An array of vowels in the source alphabet.
     */
    getSourceVowels(includeOtherLangLetters) {
        const cacheKey = includeOtherLangLetters
            ? 'SourceVowelsWithOtherLangLetters'
            : 'SourceVowelsWithoutOtherLangLetters';

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
    getSourceConsonants(includeOtherLangLetters) {
        const cacheKey = includeOtherLangLetters
            ? 'SourceConsonantsWithOtherLangLetters'
            : 'SourceConsonantsWithoutOtherLangLetters';

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
    getSourceSpecialSigns(includeOtherLangLetters) {
        const cacheKey = includeOtherLangLetters
            ? 'SourceSpecialSignsWithOtherLangLetters'
            : 'SourceSpecialSignsWithoutOtherLangLetters';

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

        const letters = letterHeap.flatMap(el => [...el]); // flatMap for flattening letter combinations
        const uniqueLetters = [...new Set(letters)];

        // Filter out other languages' letters if not needed and sort the remaining letters.
        return uniqueLetters
            .filter(letter => includeOtherLangLetters || !cfg.otherLanguagesLettersDict.hasOwnProperty(letter))
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

        const letterHeap = dictsToGetFrom.flatMap(dict => Hlprs.flattenValues(dict));

        const digraphs = letterHeap
            .filter(el => el && el.length > 1)
            .map(el => el.toLowerCase());

        return [...new Set(digraphs)]; // get unique
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
