class DefaultConfigReaderFromGitHub {
    static #PROJECT_HOME_LINK = `https://raw.githubusercontent.com/shevchenkoartem/t-literator-configs/master/`;

    getConfigObject(cfgName) {
        if (cfgName == null || !cfgName.length) {
            return {};
        }

        // TODO: think about additional/configs

        // TODO: consider subfolders:
        let jsonText = DefaultConfigReaderFromGitHub.#httpGet(`${DefaultConfigReaderFromGitHub.#PROJECT_HOME_LINK}src/${cfgName}.config`);
        jsonText = jsonText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1'); // remove comments, not affecting web links
        jsonText = jsonText.replace(/[\u202F\u00A0]/g, ' '); // replace a non-breaking space to a common one

        const config = JSON.parse(jsonText);
        return config;
    }

    static #httpGet(url) {
        const Request = typeof window === 'undefined'
            ? /* Node.js */ require("xmlhttprequest").XMLHttpRequest // prereq: npm install xmlhttprequest
            : /* browser */ XMLHttpRequest;

        const req = new Request();
        const isAsync = false;
        req.open("GET", url, isAsync);
        req.send(null);
        return req.responseText;
    }
}

// If it's Node.js:
if (typeof window === 'undefined') { module.exports = DefaultConfigReaderFromGitHub; }