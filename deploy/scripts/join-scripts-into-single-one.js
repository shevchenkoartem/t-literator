console.log('join-scripts-into-single-one.js script execution:');

const UglifyJS = require("uglify-js"); // prereq: npm install uglify-js
const fs = require('fs');
const path = require('path');

const tLiteratorPath = './';
console.log('\tThe root [t-literator-js] folder is ' + path.resolve(tLiteratorPath));

const readFile = function(relativeDirPath, filename) {
    const fullFilename = path.join(tLiteratorPath, relativeDirPath, filename);
    console.log(`\tReading ${fullFilename} file...`);
    return fs.readFileSync(fullFilename, 'utf-8');
};

const minifyJsCode = function(jsCode) {
    const options = {
        toplevel: false,
        compress: {
            global_defs: {
                "@alert": "console.log"
            },
            passes: 3
        }
    };
    const minified = UglifyJS.minify(jsCode, options);

    if (minified.error != null) {
        console.error('!!! Error !!! ' + minified.error);
        return jsCode;
    }

    if (minified.warnings != null) {
        console.log('Warnings:');
        minified.warnings.forEach(w => console.warn(w));
    }

    return minified.code;
};

const saveIntoFileWithBackingUp = function(dir, fileName, content) {
    const fileFullName = path.join(dir, fileName);
    const backupFileName = fileName.split('.')[0] +  '.back';
    const backupFileFullName = path.join(dir, backupFileName);

    if (fs.existsSync(backupFileFullName)) {
        console.log(`\tRemoving old backup ${backupFileName}...`);
        try {
            fs.unlinkSync(backupFileFullName);
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    if (fs.existsSync(fileFullName)) {
        console.log(`\tBacking up previous ${fileName} as ${backupFileName}...`);
        try {
            fs.renameSync(fileFullName, backupFileFullName);
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    let success = true;

    console.log(`\tCreating a new ${fileName} file...`);
    fs.writeFile(
        fileFullName,
        content,
        function (err) {
            if (err != null) {
                success = false;
                console.error(err);
            }
        }
    );

    return success;
};

const readJsFilesAndJoinThem = function (error, filenames) {
    if (error != null) {
        console.error(error);
        return;
    }

    filenames = filenames.sort();
    const fileContents = {};

    for (const filename of filenames) {
        fileContents[filename] = readFile('src', filename);
    }

    console.log('\tJoining all files\' contents into a single one...');
    let result = Object.values(fileContents).join('\n\n');

    console.log('\tMinifying the single content...');
    result = minifyJsCode(result);

    const resultDirPath = path.join(tLiteratorPath,'deploy', 'result');
    const success = saveIntoFileWithBackingUp(resultDirPath, 't-literator-js.js', result);

    if (success) {
        console.log('\t=====\n\tThe script is completed successfully!');
    }
};

fs.readdir(path.join(tLiteratorPath,'src'), readJsFilesAndJoinThem);