//document.body.innerHTML = getTransliteration(document.body.innerHTML);

console.log('Current folder: ' + __dirname);

const Transliterator = require('../src/transliterator');
const FileDataReader = require('../tst/file-data-reader');

const reader = new FileDataReader('/Volumes/DATA/SYNCED/OneDrive/__ ДІЯННЯ/Programming/UkrLat/Latynka/scripts/t-literator-js/');
const t = new Transliterator(reader);

const configs = [
    //'abecadlo',
    //'jireckivka',
    // 'heohraf'
    //'pasport',
    //'lucukivka',
    //'pingvinivka',
    'naukova-trad'
    // 'tem-shevchenko',
    //''
];

for (const conf of configs) {
    t.useConfig(conf);
    console.log(conf);
    console.log(t.getConfigTransliterationInfo());
    //console.log(t.getSourceConsonants(false));
    //console.log(t.getSourceVowels(false));
    //console.log(t.getSourceSpecialSigns(false));
    console.log(t.getTransliteratedAlphabet(false, true));
    console.log(t.getSourceAlphabet(false, true));
    //console.log(t.transliterate(``));
}
