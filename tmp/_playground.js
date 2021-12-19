// var script = document.createElement('script');
// script.type = 'text/javascript';
// script.src = `https://cdn.jsdelivr.net/gh/shevchenkoartem/t-literator-js/deploy/result/t-literator-js.js`;
// script.addEventListener('load', function() {
//     var t = new Transliterator();
//     t.useConfig("temivka");
//     document.body.innerHTML = t.transliterate(document.body.innerHTML);
// });
// document.head.appendChild(script);


const fs = require('fs');

console.log('Current folder: ' + __dirname);

const Transliterator = require('../src/transliterator');
const FileDataReader = require('../tst/file-data-reader');

const reader = new FileDataReader('/Volumes/DATA/SYNCED/OneDrive/__ ДІЯННЯ/Programming/UkrLat/Latynka/scripts/t-literator-js/');
const t = new Transliterator(reader);

const createTestChecksResults = function(config) {
    t.useConfig(config);
    const alphab = t.getTransliteratedAlphabet();
    const info = t.getConfigTransliterationInfo();

    const inputRawData = reader.readTestCheck('_actual_input', 'trans');
    eval("var input = `" + inputRawData + "`");

    const trans = t.transliterate(input);

    fs.writeFile(`exp_alphabet_${config}.txt`, JSON.stringify(alphab), err => console.log(err));
    fs.writeFile(`exp_info_${config}.txt`, JSON.stringify(info), err => console.log(err));
    fs.writeFile(`exp_output_${config}.txt`, trans, err => console.log(err));
};

let configs = [
    //'abecadlo',
    //'jireckivka',
    // 'heohraf'
    //'pasport',
    //'lucukivka',
    //'pingvinivka',
    //'naukova-trad'
    //"ipa",
    //'bgn-pcgn-65'
    'nice-cyr'
    // 'tem-shevchenko',
    //''
];

//configs = Object.keys(reader.getConfigPaths());


for (const conf of configs) {
    t.useConfig(conf);
    //console.log(conf);
    console.log(t.getConfigTransliterationInfo());
    //console.log(t.getSourceConsonants(false));
    //console.log(t.getSourceVowels(false));
    //console.log(t.getSourceSpecialSigns(false));
    console.log(t.getTransliteratedAlphabet(false, true));
    //console.log(t.getSourceAlphabet(false, true));
    //console.log(t.transliterate(`ЦІЄЇ СІМ'Ї`));


    createTestChecksResults(conf);
}
