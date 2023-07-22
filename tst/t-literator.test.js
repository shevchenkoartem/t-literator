const Transliterator = require('../src/3-transliterator');
const FileDataReader = require('./file-data-reader');
const path = require('path');

console.log(`Tests are running from dir: ${__dirname}`);

const fdr = new FileDataReader(path.normalize(path.join(__dirname, '../')));
const trans = new Transliterator(fdr); // TODO: try pass just a func instead of a whole object

const inputRawData = fdr.readTestCheck('_actual_input', 'trans');
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

const testConfig = function (cfgName, doNotUseDiacritic) {
    const emptyCfgStr = 'an empty config';
    const diacritiless = 'diacritiless';
    const suffix = doNotUseDiacritic ? '_nd' : '';

    let expectedRawData = !cfgName.length ? ''
        : fdr.readTestCheck(`exp_output_${cfgName}${suffix}`, 'trans', true);

    if (expectedRawData === '') { 
        // testing an empty or uncovered config
        eval("var expectedTransliteration = input"); // TODO: get rid of var
    } else {
        const toEval = "var expectedTransliteration = `" 
            + expectedRawData.replaceAll('\\', '\\\\').replaceAll('`', '\\`')
            + "`";
        eval(toEval);
    }

    trans.useConfig(cfgName);

    const actualTransliteration = trans.transliterate(input, doNotUseDiacritic);
    test(`test transliterating using ${cfgName.length ? cfgName : emptyCfgStr}` + (doNotUseDiacritic ? ` (${diacritiless})` : '') + ' config', () => {
        expect(actualTransliteration) // always calculate actual and expected in new vars above to avoid caching!!!
            .toBe(expectedTransliteration);
    });

    const actualAlphabet = trans.getConfigSourceAlphabet();
    const expectedAlphabet = cfgName.length ? expectedUkrLetters : [];
    test(`test getting source alphabet using ${cfgName.length ? cfgName : emptyCfgStr}` + (doNotUseDiacritic ? ` (${diacritiless})` : '') + ' config', () => {
        expect(actualAlphabet).toEqual(expectedAlphabet);
    });

    const actualTransAlphabet = trans.getTransliteratedAlphabet();
    expectedRawData = !cfgName.length ? '' 
        : fdr.readTestCheck(`exp_alphabet_${cfgName}${suffix}`, 'alphabet', true);

    if (expectedRawData === '') { 
        // testing an empty or uncovered config
        eval("var expectedTransAlphabet = []"); // TODO: get rid of var
    } else {
        eval("var expectedTransAlphabet = " + expectedRawData);
    }
    test(`test getting transliterated alphabet using ${cfgName.length ? cfgName : emptyCfgStr}` + (doNotUseDiacritic ? ` (${diacritiless})` : '') + ' config', () => {
        expect(actualTransAlphabet).toEqual(expectedTransAlphabet);
    });

    const actualTransInfo = trans.getConfigTransliterationInfo();
    expectedRawData = !cfgName.length ? '' 
        : fdr.readTestCheck(`exp_info_${cfgName}${suffix}`, 'info', true);
    if (expectedRawData === '') { 
        // testing an empty or uncovered config
        eval("var expectedTransInfo = {}"); // TODO: get rid of var
    } else {
        eval("var expectedTransInfo = " + expectedRawData);
    }
    test(`test getting transliteration info using ${cfgName.length ? cfgName : emptyCfgStr}` + (doNotUseDiacritic ? ` (${diacritiless})` : '') + ' config', () => {
        expect(actualTransInfo).toEqual(expectedTransInfo);
    });
};

const configs = Object.keys(fdr.getConfigPaths())
    .concat(['']);
// [
//     'abecadlo',
//     'jireckivka',
//     'heohraf',
//     'pasport',
//     'lucukivka',
//     'temivka',
//     'pingvinivka',
//     '',
//     'volapuk-askii',
//     'volapuk-unicode',
// ];

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
// ,'jireckivka'));

//const theConfig = getConfig('pasport');
//const abet_res = getAllUniqueResLetters(theConfig, false, true, true);
//const abet_src = getAllUniqueSrcLetters(theConfig, 1);
//console.log(src.join("', '"));