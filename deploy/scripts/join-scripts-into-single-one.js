console.log('join-scripts-into-single-one.js script execution:');

const UglifyJS = require("uglify-js"); // prereq: npm install uglify-js
const fs = require('fs');

const tLiteratorPath = './';

fs.readdir(tLiteratorPath + 'src/', function (error, filenames) {
    let success = true;

    if (error != null) {
        success = false;
        console.log(error);
        return;
    } else {
        filenames = filenames.sort();

        const fileContents = {};

        for (const filename of filenames) {
            const fullFilename = tLiteratorPath + 'src/' + filename;
            console.log(`\tReading ${fullFilename} file...`);

            const content = fs.readFileSync(fullFilename, 'utf-8');
            fileContents[filename] = content;
        }

        console.log('\tJoining all files\' contents into a single one...');
        let result = Object.values(fileContents).join('\n\n');

        console.log('\tMinifying the single content...');
        const options = {
            toplevel: false,
            compress: {
                global_defs: {
                    "@alert": "console.log"
                },
                passes: 3
            }
        };
        const minified = UglifyJS.minify(result, options);

        if (minified.error != null) {
            console.error('!!! Error !!! ' + minified.error);
            return;
        }

        if (minified.warnings != null) {
            console.log('Warnings:');
            minified.warnings.forEach(w => console.warn(w));
            return;
        }

        result = minified.code;

        const singleFileName = 't-literator-js.js';
        const singleFilFulleName = tLiteratorPath + 'deploy/result/' + singleFileName;
        const singlePrevFileName = 't-literator-js.back';
        const singlePrevFilFulleName = tLiteratorPath + 'deploy/result/' + singlePrevFileName;

        if (fs.existsSync(singlePrevFilFulleName)) {
            try {
                fs.unlinkSync(singlePrevFilFulleName);
            } catch (e) {
                console.error(e);
            }
        }

        if (fs.existsSync(singleFilFulleName)) {
            console.log(`\tSaving previously done ${singleFileName} as ${singlePrevFileName}...`);
            try {
                fs.renameSync(singleFilFulleName, singlePrevFilFulleName);
            } catch (e) {
                console.error(e);
            }
        }

        console.log(`\tCreating a new ${singleFileName} file...`);
        fs.writeFile(
            singleFilFulleName,
            result,
            function (err) {
                success = false;
                if (err != null) {
                    console.log(err);
                }
            }
        );
    }

    if (success) {
        console.log('\t=====\n\tThe script is completed successfully!');
    }
});