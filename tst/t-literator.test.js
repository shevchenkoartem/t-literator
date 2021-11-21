const Transliterator = require('../src/t-literator');
const FileDataReader = require('./file-data-reader');

const fdr = new FileDataReader();
const trans = new Transliterator(fdr); // TODO: try pass just a func instead of a whole object

const inputRawData = fdr.readTestCheck('input_ukr-lat');
eval("var input = `" + inputRawData + "`"); // TODO: get rid of var

const expectedUkrLetters = [
    'А', 'Б', 'В', 'Г', 'Ґ', 'Д', 'Е', 'Є', 'Ж',
    'З', 'И', 'І', 'Ї', 'Й', 'К', 'Л', 'М', 'Н',
    'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц',
    'Ч', 'Ш', 'Щ', 'Ь', 'Ю', 'Я', 'а', 'б', 'в',
    'г', 'ґ', 'д', 'е', 'є', 'ж', 'з', 'и', 'і',
    'ї', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р',
    'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ',
    'ь', 'ю', 'я'
];

const testConfig = function(cfgName, doNotUseDiacritic) {
    if (!cfgName.length) { // testing an empty config
        eval("var expectedTransliteration = input"); // TODO: get rid of var
    } else {
        const suffix = doNotUseDiacritic ? '_nd' : '';
        const expectedRawData = fdr.readTestCheck(`expected_${cfgName}${suffix}`);
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
};

const configs = [
    'ukr-lat-jireckivka-1859',
    'ukr-lat-heohraf-1996',
    'ukr-lat-kabmin-2010',
    ''
    //'ukr-lat-uatem'
];

for (const conf of configs) {
    testConfig(conf);
}

//---------------------

// trans.useConfig(configs[0]);
// console.log(trans.getSourceAlphabet());
// console.log(trans.getTransliteratedAlphabet());

// console.log(getTransliteration(
// ``
// ,'ukr-lat-jireckivka-1859'));

//const theConfig = getConfig('ukr-lat-kabmin-2010');
//const abet_res = getAllUniqueResLetters(theConfig, false, true, true);
//const abet_src = getAllUniqueSrcLetters(theConfig, 1);
//console.log(src.join("', '"));