const Transliterator = require('../src/t-literator');
const FileDataReader = require('./file-data-reader');

const fdr = new FileDataReader();
const trans = new Transliterator(fdr); // TODO: try pass just a func instead of a whole object

const inputRawData = fdr.readTestCheck('input_ukr-lat', 'trans');
eval("var input = `" + inputRawData + "`"); // TODO: get rid of var

const expectedUkrLetters = [ // TODO: move to file
    'А', 'а', 'Б', 'б', 'В', 'в', 'Г', 'г', 'Ґ',
    'ґ', 'Д', 'д', 'Е', 'е', 'Є', 'є', 'Ж', 'ж',
    'З', 'з', 'И', 'и', 'І', 'і', 'Ї', 'ї', 'Й',
    'й', 'К', 'к', 'Л', 'л', 'М', 'м', 'Н', 'н',
    'О', 'о', 'П', 'п', 'Р', 'р', 'С', 'с', 'Т',
    'т', 'У', 'у', 'Ф', 'ф', 'Х', 'х', 'Ц', 'ц',
    'Ч', 'ч', 'Ш', 'ш', 'Щ', 'щ', 'Ь', 'ь', 'Ю',
    'ю', 'Я', 'я'
];

const testConfig = function(cfgName, doNotUseDiacritic) {
    if (!cfgName.length) { // testing an empty config
        eval("var expectedTransliteration = input"); // TODO: get rid of var
    } else {
        const suffix = doNotUseDiacritic ? '_nd' : '';
        const expectedRawData = fdr.readTestCheck(`exp_output_${cfgName}${suffix}`, 'trans');
        eval("var expectedTransliteration = `" + expectedRawData + "`"); 
    }

    trans.useConfig(cfgName);

    const actualTransliteration = trans.transliterate(input, doNotUseDiacritic);
    test(`test transliterating using ${cfgName.length ? cfgName : 'an empty config'}` + (doNotUseDiacritic ? ' (diacritiless)' : '') + ' config', () => {
        expect(actualTransliteration) // always calculate actual and expected in new vars above to avoid caching!!!
            .toBe(expectedTransliteration);
    });

    const actualAlphabet = trans.getSourceAlphabet();
    const expectedAlphabet = cfgName.length ? expectedUkrLetters : [];
    test(`test getting source alphabet using ${cfgName.length ? cfgName : 'an empty config'}` + (doNotUseDiacritic ? ' (diacritiless)' : '') + ' config', () => {
        expect(actualAlphabet).toEqual(expectedAlphabet);
    });

    const actualTransAlphabet = trans.getTransliteratedAlphabet();
    if (!cfgName.length) { // testing an empty config
        eval("var expectedTransAlphabet = []"); // TODO: get rid of var
    } else {
        const suffix = doNotUseDiacritic ? '_nd' : '';
        const expectedRawData = fdr.readTestCheck(`exp_alphab_${cfgName}${suffix}`, 'alphab');
        eval("var expectedTransAlphabet = " + expectedRawData); 
    }
    test(`test getting transliterated alphabet using ${cfgName.length ? cfgName : 'an empty config'}` + (doNotUseDiacritic ? ' (diacritiless)' : '') + ' config', () => {
        expect(actualTransAlphabet).toEqual(expectedTransAlphabet);
    });

    const actualTransInfo = trans.getConfigTransliterationInfo();
    if (!cfgName.length) { // testing an empty config
        eval("var expectedTransInfo = {}"); // TODO: get rid of var
    } else {
        const suffix = doNotUseDiacritic ? '_nd' : '';
        const expectedRawData = fdr.readTestCheck(`exp_info_${cfgName}${suffix}`, 'info');
        eval("var expectedTransInfo = " + expectedRawData); 
    }
    test(`test getting transliteration info using ${cfgName.length ? cfgName : 'an empty config'}` + (doNotUseDiacritic ? ' (diacritiless)' : '') + ' config', () => {
        expect(actualTransInfo).toEqual(expectedTransInfo);
    });
};

const configs = [
    'ukr-lat-jireckivka-1859',
    'ukr-lat-heohraf-1996',
    'ukr-lat-kabmin-2010',
    'ukr-lat-abecadlo-1835',
    'ukr-lat-temivka-2021',
    ''
];

for (const conf of configs) {
    testConfig(conf);
}

//---------------------

//trans.useConfig(configs[3]);
//console.log(trans.transliterate(""));
//сonsole.log(trans.getSourceAlphabet());
// console.log(trans.getTransliteratedAlphabet());

// console.log(getTransliteration(
// ``
// ,'ukr-lat-jireckivka-1859'));

//const theConfig = getConfig('ukr-lat-kabmin-2010');
//const abet_res = getAllUniqueResLetters(theConfig, false, true, true);
//const abet_src = getAllUniqueSrcLetters(theConfig, 1);
//console.log(src.join("', '"));