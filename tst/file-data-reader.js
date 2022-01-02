const fs = require('fs');
const walk = require('walk'); // prereq: npm install --save walk
const path = require('path');

class FileDataReader {
    #projectHomeDir = './';
    #configPaths = {};
    #CONFIG_EXT = '.config';

    constructor(homeDir) {
        this.#projectHomeDir = homeDir;

        const that = this;
        const options = {
            filters: ['ignore'], // directories with these keys will be skipped
            listeners: {
                files: function (root, fileStats, next) {
                    for (const stat of fileStats) {
                        if (path.extname(stat.name) === that.#CONFIG_EXT) {
                            const absoluteFullName = path.join(root, stat.name);
                            // push to configPaths:
                            that.#configPaths[path.basename(absoluteFullName, that.#CONFIG_EXT)]
                                = absoluteFullName;
                        }
                        next();
                    }
                },
                errors: function (root, nodeStatsArray, next) {
                    next();
                },
            },
        };

        walk.walkSync(
            path.join(this.#projectHomeDir, `configs/src`),
            options);
    }

    readFileUsingRelPath(folderPart, fileName, returnEmptyIfNotExist) {
        const absoluteFullName = path.join(
            this.#projectHomeDir,
            folderPart ?? '',
            fileName ?? ''
        );

        try {
            return fs.readFileSync(absoluteFullName, 'utf8');
        } catch(e) {
            if (!returnEmptyIfNotExist) { 
                throw e; 
            }
            return ''; 
        }
    }

    getConfigObject(cfgCode) {
        if (cfgCode == null) {
            return undefined;
        }

        if (!cfgCode.length || !(cfgCode in this.#configPaths)) {
            return { code: cfgCode };
        }

        let jsonText = fs.readFileSync(this.#configPaths[cfgCode], 'utf8');
        jsonText = jsonText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1'); // remove comments, not affecting web links
        jsonText = jsonText.replace(/[\u202F\u00A0]/, ' '); // replace a non-breaking space to a common one

        const config = JSON.parse(jsonText);
        return config;
    }

    readTestCheck(chkName, folder, returnEmptyIfNotExist) {
        const folderPath = path.join(
            `/configs/test-checks`,
            folder ?? ''
        );
        const res = this.readFileUsingRelPath(folderPath, `${chkName}.txt`, returnEmptyIfNotExist);
        return res;
    }

    getConfigPaths() {
        return {...this.#configPaths};
    }
}

module.exports = FileDataReader;