//document.body.innerHTML = getTransliteration(document.body.innerHTML);

const Transliterator = require('../src/transliterator');
const FileDataReader = require('../tst/file-data-reader');

const reader = new FileDataReader();
const t = new Transliterator(reader);

const configs = [
    'abecadlo',
    'jireckivka',
    // 'heohraf',
    'pasport',
    'lucukivka',
    // 'tem-shevchenko',
    ''
];

for (const conf of configs) {
    t.useConfig(conf);
    console.log(conf);
    console.log(t.getConfigTransliterationInfo());
    //console.log(t.getSourceConsonants(false));
    //console.log(t.getSourceVowels(false));
    //console.log(t.getSourceSpecialSigns(false));
    //console.log(t.getTransliteratedAlphabet(false, true));
    //console.log(t.getSourceAlphabet(false, true));
    //console.log(t.transliterate(``));
}