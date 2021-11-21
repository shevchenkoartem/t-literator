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
        jsonData = fs.readFileSync(pathOrLink);

        return jsonData;
    }

    getConfigObject(cfgName) {
        if (cfgName == null || !cfgName.length) {
            return {};
        }

        const jsonData = this.readFile(`/configs`, `${cfgName}.json`);
        const config = JSON.parse(jsonData);
        return config;
    }
    
    readTestCheck(chkName) {
        return this.readFile(`/configs/test-checks`, `${chkName}.txt`);
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