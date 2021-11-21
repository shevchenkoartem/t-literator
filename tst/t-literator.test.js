const Transliterator = require('../src/t-literator');
const FileDataReader = require('./file-data-reader');

const fdr = new FileDataReader();
const trans = new Transliterator(fdr); // TODO: try pass just a func instead of a whole object

const inputRawData = fdr.readTestCheck('input_ukr-lat');
eval("var input = `" + inputRawData + "`"); // TODO: get rid of var

const testConfig = function(cfgName, doNotUseDiacritic) {
    var expected; // TODO: get rid of var

    if (!cfgName.length) { // testing an empty config
        expected = input; 
    } else {
        const suffix = doNotUseDiacritic ? '_nd' : '';
        const expectedRawData = fdr.readTestCheck(`expected_${cfgName}${suffix}`);
        eval("expected = `" + expectedRawData + "`"); 
    }

    trans.useConfig(cfgName);
    const actual = trans.transliterate(input, doNotUseDiacritic);

    test(`test using ${cfgName.length ? cfgName : 'an empty config'}` + (doNotUseDiacritic ? ' (diacritiless)' : '') + ' config', () => {
        expect(actual).toBe(expected);
    });
};

const configs = [
    'ukr-lat-jireckivka-1859',
    //'ukr-lat-heohraf-1996',
    'ukr-lat-kabmin-2010',
    ''
    //'ukr-lat-uatem'
];

for (const conf of configs) {
    testConfig(conf);
}


trans.useConfig(configs[0]);
console.log(trans.getSourceAlphabet());
console.log(trans.getTransliteratedAlphabet());

//---------------------

// console.log(getTransliteration(
// ``
// ,'ukr-lat-jireckivka-1859'));

//const theConfig = getConfig('ukr-lat-kabmin-2010');
//const abet_res = getAllUniqueResLetters(theConfig, false, true, true);
//const abet_src = getAllUniqueSrcLetters(theConfig, 1);
//console.log(src.join("', '"));