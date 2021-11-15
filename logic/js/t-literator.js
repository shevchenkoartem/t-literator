//'use strict';
const fs = require('fs');

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
        
class Transliterator {
    #WORD_START = "~~~start~~~";
    #WORD_END = "~~~end~~~";
    
    #config = {};
    #useDiacritics = true;

    #setConfig(cfgName) {
        const rawdata = fs.readFileSync(`../../configs/${cfgName}.json`);
        
        this.#config = JSON.parse(rawdata); // TODO: use it instead when comments removed
        //eval("var ttt = " + rawdata); // TODO: get rid of var
        
        this.#ensureConfigCompleted();
    }

    #ensureConfigCompleted() {
        this.#config.code = this.#config.code ?? 'code' + Math.floor(Math.random() * 1000);
        this.#config.name = this.#config.name ?? 'Unnamed';
        this.#config.desc = this.#config.desc ?? '';
        this.#config.link = this.#config.link ?? '';
    
        this.#config.hasVowelBeModifiedInsteadOfConsonantWhenSofting =
            this.#config.hasVowelBeModifiedInsteadOfConsonantWhenSofting ?? false;
        this.#config.useLocationInWordAlgo = this.#config.useLocationInWordAlgo ?? false;
    
        // arrs:
        this.#config.unsoftables = this.#config.unsoftables ?? [];
        this.#config.softingSigns = this.#config.softingSigns ?? [];
        // dicts:
        this.#config.softedDict = Transliterator.#getNormalizedDictStructure(this.#config.softedDict);
        this.#config.dict = Transliterator.#getNormalizedDictStructure(this.#config.dict);
        this.#config.softingDict = Transliterator.#getNormalizedDictStructure(this.#config.softingDict);
        this.#config.softingForcedDict = Transliterator.#getNormalizedDictStructure(this.#config.softingForcedDict);
        this.#config.beforeFixDict = Transliterator.#getNormalizedDictStructure(this.#config.beforeFixDict);
        this.#config.finalFixDict = Transliterator.#getNormalizedDictStructure(this.#config.finalFixDict);
    
        // beforeFixDict uses it's own rules:
        Transliterator.#completeByUpperAndTitleCased(this.#config.beforeFixDict);
        if (!this.#useDiacritics) {
            Transliterator.#completeByNonDiacritics(this.#config.beforeFixDict, true);
        }
    
        const cols = [ 
            // arrs:
            this.#config.unsoftables,
            this.#config.softingSigns,
    
            // dicts:
            this.#config.softedDict,
            this.#config.dict,
            this.#config.softingDict,
            this.#config.softingForcedDict,
            ////this.#config.beforeFixDict
            this.#config.finalFixDict
        ];
    
        for (const col of cols) {
            Transliterator.#completeByUpperAndTitleCased(col);
    
            if (!this.#useDiacritics) {
                Transliterator.#completeByNonDiacritics(col);
            }
        }
    }

    // Makes dict structure normalized to common rules. E.g. "а": "a" becomes "а": [ "a" ]
    // (because each dict value should be array of [0] = diacritic and (optionally) [1] = non-diacritic value) 
    static #getNormalizedDictStructure(dict) {
        const res = {};
        
        if (dict == null) {
            return res;
        }
    
        for (const key of Object.keys(dict)) {
            const isValue = !Array.isArray(dict[key]);
            const isEmptyArray = Array.isArray(dict[key]) && dict[key].length === 0;
            //const isArrayWith1or2Elems = Array.isArray(dict[key]) && (dict[key].length === 1 || dict[key].length === 2);
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
    
    #markStartingPositions(txt) {
        const letters = this.getAllUniqueSrcLetters().join('');
    
        let pattern = new RegExp(`(?<a>^|[^${letters}]+)(?<b>[${letters}])`, 'gu');
        let res = txt.replaceAll(pattern, `$<a>${this.#WORD_START}$<b>`);
        
        pattern = new RegExp(`(?<b>[${letters}])(?<c>$|[^${letters}]+)`, 'gu');
        res = res.replaceAll(pattern, `$<b>${this.#WORD_END}$<c>`);
    
        // Words with apostroph is a single word:
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
    
        const digraphs = this.getAllUniqueResLetters(true, true)
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

    /// If the second (non-diacritics) value/array in the dictOfArrs
    /// hasn't been set – let's copy it without diacritics.
    static #completeByNonDiacritics(/*[ref]*/dictOfArrs, doNotForce) { // TODO: use last arg level upper
        if (dictOfArrs.constructor !== Object) {
            return;
        }
            
        for (const arr of Object.values(dictOfArrs)) {
            if (!arr.length) {
                continue; // it shouldn't happen
            }
            
            if (arr.length === 1) {
                // Copy second one from the first one:
                arr.push(StringValueOrArrayHelpers.toDiacriticless(arr[0]));
            } else if (!doNotForce) { // arr.length > 1 and forced mode
                arr[1] = StringValueOrArrayHelpers.toDiacriticless(arr[1]); // forced mode: ensure given second value doesn't have diacritics
            } else {
                // do nothing;
            } 
        }
    }
    
    static #completeByUpperAndTitleCased(/*[ref]*/arrOrDict) {
        const toCaseFuncs = [ 
            StringValueOrArrayHelpers.toTitleCase, 
            StringValueOrArrayHelpers.toUpperCase 
        ];
        
        if (Array.isArray(arrOrDict)) {
            const toConcat = [];
    
            for (const item of arrOrDict) {
                for (const toCaseFunc of toCaseFuncs) {
                    const toPush = toCaseFunc(item);
                    if (!arrOrDict.includes(toPush) && !toConcat.includes(toPush)) {
                        toConcat.push(toPush);
                    }
                }
            }
            
            toConcat.forEach(val => arrOrDict.push(val)); // instead of: arrOrDict = arrOrDict.concat(toConcat);
        } else { // dictionary:
            for (const [lowerKey, lowerArr] of Object.entries(arrOrDict)) {
                for (const toCaseFunc of toCaseFuncs) {
                    const casedKey = toCaseFunc(lowerKey); 
                    if (arrOrDict.hasOwnProperty(casedKey)) {
                        continue;
                    }
    
                    const casedArr = [];
                    for (const valOrArr of lowerArr) {
                        casedArr.push(toCaseFunc(valOrArr));
                    }
    
                    arrOrDict[casedKey] = casedArr;
                }
            }
        }
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

    constructor(cfgName, doNotUseDiacritic) {
        this._useDiacritics = !doNotUseDiacritic;
        this.#setConfig(cfgName);
    }

    get config() {
        return {...this.#config};
    }

    // TODO: should be func of tranliterator object
    transliterate(txt) {
        const indexToGet = !this.#useDiacritics ? 1 : 0;

        let lat = txt;
    
        const apos = ["'",'`','‘','’'];
        const apo = "'"; // TODO: розширити набір?
        const tempApostroph = '~~~apostroph~~~';
        const tempSoftingApo = '~~~softing_apo~~~';
    
        const specSymbolsDict = { // TODO: make replacing these symbs an option
            "'" : [ '', '' ],
            '’' : [ '', ''],
            '«' : [ '„', '"'],
            '»' : [ '“', '"' ],
        };
    
        if (this.#config.useLocationInWordAlgo) {
            lat = this.#markStartingPositions(lat);
        }
    
        lat = this.#replaceAllByDict(lat, 
            this.#config.beforeFixDict, 
            this.#config.useLocationInWordAlgo);    
    
        for (const a of apos) {
            lat = lat.replaceAll(a, tempApostroph); // To mark real apostroph sign
        }
    
        for (const [softingKey, softingVals] of Object.entries(this.#config.softingDict)) {
            for (const unsoftable of this.#config.unsoftables) {
                
                const softingArr = this.#config.hasVowelBeModifiedInsteadOfConsonantWhenSofting
                    ? softingVals
                    : this.#config.softingForcedDict[softingKey];
    
                if (this.#config.useLocationInWordAlgo && Array.isArray(softingArr[indexToGet])) {
                    const replSoftingKeyLocated = Transliterator.#getPositionalValue(softingArr[indexToGet], 2);
                    lat = lat.replaceAll(unsoftable + softingKey + this.#WORD_END, unsoftable + replSoftingKeyLocated + this.#WORD_END);
                    // TODO: + beginning with unsoftable
                }
    
                // replace either value (common case) or middle value (if useLocationInWordAlgo):
                const replSoftingKey = Transliterator.#getPositionalValue(softingArr[indexToGet]);
                lat = lat.replaceAll(unsoftable + softingKey, unsoftable + replSoftingKey);
            }
    
            for (const [softedKey, softedVals] of Object.entries(this.#config.softedDict)) {
                // TODO: consider useLocationInWordAlgo
                
                const softed = this.#config.hasVowelBeModifiedInsteadOfConsonantWhenSofting && !this.#config.softingSigns.includes(softingKey) 
                    ? softedKey 
                    : Transliterator.#getPositionalValue(softedVals[indexToGet]);
                
                if (this.#config.useLocationInWordAlgo && Array.isArray(softingVals[indexToGet])) {
                    lat = lat.replaceAll(softedKey + softingKey + this.#WORD_END, softed + Transliterator.#getPositionalValue(softingVals[indexToGet], 2) + this.#WORD_END);
                    // TODO: + beginning with softed
                }
    
                lat = lat.replaceAll(softedKey + softingKey, softed + Transliterator.#getPositionalValue(softingVals[indexToGet]));
            }
        }
    
        lat = lat.replaceAll(apo, tempSoftingApo); // To prevent killing softing <'> on the next step
        lat = lat.replaceAll(tempApostroph, apo); // Now real apostroph comes back
    
        lat = this.#replaceAllByDict(lat, this.#config.dict, this.#config.useLocationInWordAlgo); 
        lat = this.#replaceAllByDict(lat, specSymbolsDict, this.#config.useLocationInWordAlgo); 
    
        lat = lat.replaceAll(tempSoftingApo, apo); // Now softing <'> comes back
    
        if (this.#config.useLocationInWordAlgo) {
            lat = lat.replaceAll(this.#WORD_START, '');
            lat = lat.replaceAll(this.#WORD_END, '');
        }
        
        lat = this.#detectAndFixCapsLocked(lat);
    
        lat = this.#replaceAllByDict(lat, this.#config.finalFixDict, this.#config.useLocationInWordAlgo); 
    
        return lat;
    }

    getAllUniqueResLetters(getOnlyLower, doNotSeparateDigraphs) {
        const indexToGet = !this.#useDiacritics ? 1 : 0;
        
        const flatValuesAt = function(obj) {
            return Object.values(obj).flatMap(val => val[indexToGet]);
        };

        const letterHeap = flatValuesAt(this.#config.beforeFixDict)
            .concat(flatValuesAt(this.#config.dict))
            .concat(flatValuesAt(this.#config.softedDict))
            .concat(flatValuesAt(this.#config.softingDict))
            .concat(flatValuesAt(this.#config.softingForcedDict))
            .concat(flatValuesAt(this.#config.finalFixDict));
    
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
            .filter((v, i, s) => s.indexOf(v) === i)
            .sort(function(a, b) {
                const f = StringValueOrArrayHelpers.toDiacriticless;
                if (f(a) < f(b)) {
                    return -1;
                }
                if (f(a) > f(b)) {
                    return 1;
                }
                if (f(a) === f(b)) {
                    if (a < b) { return -1; }
                    if (a > b) { return 1; }
                }
                // a===b
                return 0;
            });
    }
    
    getAllUniqueSrcLetters(getOnlyLower) {
        const letterHeap = this.#config.unsoftables
            .concat(this.#config.softingSigns)
            .concat(Object.keys(this.#config.dict))
            .concat(Object.keys(this.#config.softedDict))
            .concat(Object.keys(this.#config.softingDict))
            .concat(Object.keys(this.#config.softingForcedDict))
            .concat(Object.keys(this.#config.beforeFixDict));
    
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
            .filter((v, i, s) => s.indexOf(v) === i)
            .sort();
    }
}

///---------- Testing function: ------------

const testConfig = function(cfgName, doNotUseDiacritic) {
    const inputRawData = fs.readFileSync(`../../test-checks/input_ukr-lat.txt`);
    eval("var input = `" + inputRawData + "`"); // TODO: get rid of var

    const suffix = doNotUseDiacritic ? '_nd' : '';
    const expectedRawData = fs.readFileSync(`../../test-checks/expected_${cfgName}${suffix}.txt`);
    eval("var expected = `" + expectedRawData + "`"); // TODO: get rid of var

    const trans = new Transliterator(cfgName, doNotUseDiacritic);
    const actual = trans.transliterate(input);

    if (expected.trim() === actual.trim()) {
        //console.log(actual);
        console.log('OK :)');
    } else {    
        const expSpl = expected.split(/\s+/);
        const actSpl = actual.split(/\s+/);

        const l = Math.min(expSpl.length, actSpl.length);

        for (let i = 0; i<l; ++i) {
            if (expSpl[i] === actSpl[i]) {
                continue;
            }
            console.log('[actual] ' + actSpl[i] + ' ≠ ' + expSpl[i]);
        }
        //console.log(actual);
        console.log('NOK :(');
    }   
};

///---------- Script logic: ------------

const configs = [
    'ukr-lat-jireckivka-1859',
    //'ukr-lat-heohraf-1996',
    'ukr-lat-kabmin-2010',
    //'ukr-lat-uatem'
];

for (const conf of configs) {
    console.log(`\n${conf}:`);
    testConfig(conf);
}

// console.log(getTransliteration(
// ``
// ,'ukr-lat-jireckivka-1859'));

//const theConfig = getConfig('ukr-lat-kabmin-2010');
//const abet_res = getAllUniqueResLetters(theConfig, false, true, true);
//const abet_src = getAllUniqueSrcLetters(theConfig, 1);
//console.log(src.join("', '"));

//---------------------

//document.body.innerHTML = getTransliteration(document.body.innerHTML);