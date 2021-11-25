class Transliterator {
    #WORD_START = '【⟨';
    #WORD_END = '⟩】';
    static #AFFECTING = 'affecting';
    static #AFFECTED = 'affected';
    
    #config = {}; // TODO: probably, would be better to cache prev. used configs and use array here + currConfigIndex
    #implementingGetConfigObject;
    #useDiacritics = true;

    constructor(implementingGetConfigObject, /*[optional]*/ cfgName) {
        this.#implementingGetConfigObject = implementingGetConfigObject != null
            ? implementingGetConfigObject
            : new DefaultConfigReaderFromGitHub();
        
        if (cfgName != null) {
            this.useConfig(cfgName);
        }
    }

    get config() {
        return {...this.#config};
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
    
        return lat;
    }

    useConfig(cfgName) {
        this.#config = this.#implementingGetConfigObject.getConfigObject(cfgName);
        this.#ensureConfigCompleted();
    }

    // getGeneralCyrTranslationDictionary() {
    //     const result = {};

    //     const source


    //     for (const cyrLetter of cyrLowerAlphabet.split('')) {

    //     }
        
    // }

    // TODO /* rethink collections */
    getSourceAlphabet(getOnlyLower) {
        const letterHeap = this.#config.unsoftableConsonants
            .concat(Object.keys(this.#config.softingSignsMultiDict))
            .concat(Object.keys(this.#config.dict))
            .concat(Object.keys(this.#config.softableConsonantsDict))
            .concat(Object.keys(this.#config.softingVowelsMultiDict))
            .concat(Object.keys(this.#config.beforeStartDict));
    
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
            .sort(Transliterator.#alphabetOrderComparator);
    }

    // TODO /* rethink collections */
    getTransliteratedAlphabet(getOnlyLower, doNotSeparateDigraphs) {
        const indexToGet = !this.#useDiacritics ? 1 : 0;
        
        const flatValuesAt = function(obj) {
            return Object.values(obj).flatMap(val => 
                val.constructor === Object 
                ? flatValuesAt(val) 
                : val[indexToGet]);
        };

        const letterHeap = flatValuesAt(this.#config.beforeStartDict)
            .concat(flatValuesAt(this.#config.dict))
            .concat(flatValuesAt(this.#config.softableConsonantsDict))
            .concat(flatValuesAt(this.#config.softingVowelsMultiDict))
            .concat(flatValuesAt(this.#config.softingSignsMultiDict))
            .concat(flatValuesAt(this.#config.afterFinishDict));
    
        const letters = [];
        for (const el of letterHeap) {
            if (el == null) { // it shouldn't happen
                continue;
            }
            
            let len = el.length;
            
            if (len === 1 || doNotSeparateDigraphs) {
                letters.push(getOnlyLower ? el.toLowerCase() : el);
                continue;
            }
    
            // add each letter separately:
            if (len > 1 ) {
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

    #ensureConfigCompleted() {
        this.#config.code = this.#config.code ?? 'code' + Math.floor(Math.random() * 1000);
        this.#config.name = this.#config.name ?? 'Unnamed';
        this.#config.desc = this.#config.desc ?? '';
        this.#config.link = this.#config.link ?? '';
        this.#config.link = this.#config.from ?? '';
        this.#config.link = this.#config.to ?? '';
    
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
        const letters = this.getSourceAlphabet().join('');
    
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
    
        const digraphs = this.getTransliteratedAlphabet(true, true)
            .filter(t => t.length > 1); // TODO прочистити від шлаку
    
        const mappedMatches = matches.map(m => ({
            probablyIssue: m[1] != null ? m[1] : m[4],
            after: m[2] != null ? m[2] : '',
            before: m[3] != null ? m[3] : '',
            index: m.index
        }));
    
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
                res[key] = [ dict[key] ]; // value or pre-mid-post placing array was set in short diacritic-only form
                continue;
            }
    
            if (isEmptyArray) {
                res[key] = [ "" ]; // should not happen
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
        
    static #getPositionalValue(from, preIs0_midIs1_postIs2) { // прототип для обробки можливості мати тріаду префікс-мід-пост
        if (preIs0_midIs1_postIs2 == null) {
            preIs0_midIs1_postIs2 = 1; // default is mid
        }
    
        return Array.isArray(from)
            ? (from.length > preIs0_midIs1_postIs2 
                ? from[preIs0_midIs1_postIs2] 
                : from[from.length - 1])
            : from;
    }

    #normalizeApostrophesSingleKeyDict() {
        let keys;
        if (this.#config.apostrophesSingleKeyDict != null) {
            keys = Object.keys(this.#config.apostrophesSingleKeyDict);
        }

        if (keys == null || !keys.length) {
            this.#config.apostrophesSingleKeyDict = { "": ""};
        } else {
            let i = 0;
            // ensure dict has a single key:
            keys.forEach((key) => 
                i++ === 0 || delete this.#config.apostrophesSingleKeyDict[key]);
        }
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
                arrOrAffectionDict.push(StringValueOrArrayHelpers.toDiacriticless(arrOrAffectionDict[0]));
            } else if (!doNotForce) { // arr.length > 1 and forced mode
                arrOrAffectionDict[1] = StringValueOrArrayHelpers.toDiacriticless(arrOrAffectionDict[1]); // forced mode: ensure given second value doesn't have diacritics
            } else {
                // do nothing;
            } 
        }
    }
    
    static #completeByUpperAndTitleCased(/*[ref]*/arrOrDictOrMulti) {
        const toCaseFuncs = [ 
            StringValueOrArrayHelpers.toTitleCase, 
            StringValueOrArrayHelpers.toUpperCase 
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
        let cyrAlphabet = 'АБВГҐДЃЂЕЀЄЁЖЗЗ́ЅИЍІЇЙЈКЛЉМНЊОПРСС́ТЋЌУЎФХЦЧЏШЩЪЫЬЭЮЯ';
        cyrAlphabet += cyrAlphabet.toLowerCase();

        const getLetterWeight = function(l) {
            return cyrAlphabet.includes(l) 
                ? cyrAlphabet.indexOf(l) + 1000000 // to make cyr symbols after lat
                : StringValueOrArrayHelpers.toDiacriticless(l).charCodeAt() 
                    + l.charCodeAt()/1000000; // when comparing, diacriticless value is 1st priority, real value - 2nd
        };

        return getLetterWeight(a) - getLetterWeight(b);
    }
}

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
    static toUpperCase(valOrArr) {
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
        return valOrArr.toUpperCase();
    }

    static toDiacriticless(valOrArr) {
        if (valOrArr == null) {
            return null;
        }
    
        // recursive calls for each array's element:
        if (Array.isArray(valOrArr)) {
            const diacriticlessArr = [...valOrArr];
    
            for (let i=0; i<diacriticlessArr.length; ++i) {
                diacriticlessArr[i] = StringValueOrArrayHelpers.toDiacriticless(diacriticlessArr[i]);
            }
    
            return diacriticlessArr;
        }
    
        // the arg is a string value:
        return valOrArr.normalize("NFD").replace(/\p{Diacritic}/gu, ""); 
    }
}

class DefaultConfigReaderFromGitHub {
    static #PROJECT_HOME_LINK = `https://raw.githubusercontent.com/shevchenkoartem/t-literator-configs/master/`;

    getConfigObject(cfgName) {
        if (cfgName == null || !cfgName.length) {
            return {};
        }

        const jsonData = DefaultConfigReaderFromGitHub.#httpGet(`${DefaultConfigReaderFromGitHub.#PROJECT_HOME_LINK}${cfgName}.json`);
        const config = JSON.parse(jsonData);
        return config;
    }

    static #httpGet(url) {
        const Request = typeof window === 'undefined'
            ? /* Node.js */ require("xmlhttprequest").XMLHttpRequest // prereq: npm install xmlhttprequest
            : /* browser */ XMLHttpRequest;
        
        const req = new Request();
        const isAsync = false;
        req.open("GET", url, isAsync);
        req.send(null);
        return req.responseText;
    }
}

// If it's Node.js:
if (typeof window === 'undefined') { module.exports = Transliterator; }

//document.body.innerHTML = getTransliteration(document.body.innerHTML);

// // USAGE
// // FileDataReader - some class which has method getConfigObject(cfgName) 
// // // (reads config json-file and parses it)
// const trans = new Transliterator(new FileDataReader());
// trans.useConfig(cfgName); // can be called again with another config
// const doNotUseDiacritic = false;
// const result = trans.transliterate("some text", /*[can be simply omitted]*/doNotUseDiacritic);