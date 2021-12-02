class FileDataReader {
    #PROJECT_HOME_DIR = './';

    readFile(folderPart, fileName) {
        let jsonData = '';
        
        const pathOrLink = FileDataReader.#joinPaths([
            this.#PROJECT_HOME_DIR, 
            folderPart, 
            fileName
        ]);

        const fs = require('fs');
        jsonData = fs.readFileSync(pathOrLink, 'utf8');

        return jsonData;
    }

    getConfigObject(cfgName) {
        if (cfgName == null || !cfgName.length) {
            return {};
        }

        let jsonText = this.readFile(`/configs/src`, `${cfgName}.json`);
        jsonText = jsonText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1'); // remove comments, not affecting web links
        jsonText = jsonText.replace(/[\u202F\u00A0]/, ' '); // replace a non-breaking space to a common one

        const config = JSON.parse(jsonText);
        return config;
    }
    
    readTestCheck(chkName, folder) {
        const folderPath = FileDataReader.#joinPaths([
            `/configs/test-checks`,
            (folder != null) ? `/${folder}` : ''
        ]);
        return this.readFile(folderPath, `${chkName}.txt`);
    }

    static #joinPaths(paths) { // TODO: try to find fs method
        const SLASH = `/`;

        if (paths.length < 2) {
            return paths.length ? paths[0] : '';
        }
        
        let pre = paths[0];
        const rests = paths.slice(1);

        const preHasSl = pre.endsWith(SLASH);
        const postHasSl = rests[0].startsWith(SLASH);

        if (preHasSl && postHasSl) {
            pre = pre.slice(0, -1);
        }

        if (!preHasSl && !postHasSl) {
            pre = pre + SLASH;
        }

        rests[0] = pre + rests[0];
        return FileDataReader.#joinPaths(rests);
    }
}

module.exports = FileDataReader;