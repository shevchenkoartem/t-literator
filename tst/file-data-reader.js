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

    readFileUsingRelPath(folderPart, fileName) {
        const absoluteFullName = path.join(
            this.#projectHomeDir,
            folderPart ?? '',
            fileName ?? ''
        );

        return fs.readFileSync(absoluteFullName, 'utf8');
    }

    getConfigObject(cfgName) {
        if (cfgName == null || !cfgName.length || !(cfgName in this.#configPaths)) {
            return {};
        }

        let jsonText = fs.readFileSync(this.#configPaths[cfgName], 'utf8');
        jsonText = jsonText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1'); // remove comments, not affecting web links
        jsonText = jsonText.replace(/[\u202F\u00A0]/, ' '); // replace a non-breaking space to a common one

        const config = JSON.parse(jsonText);
        return config;
    }

    readTestCheck(chkName, folder) {
        const folderPath = path.join(
            `/configs/test-checks`,
            folder ?? ''
        );
        const res = this.readFileUsingRelPath(folderPath, `${chkName}.txt`);
        return res;
    }
}

module.exports = FileDataReader;