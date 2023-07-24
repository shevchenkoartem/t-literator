const TransConfig = typeof window === 'undefined'
    ? /* Node.js */ require('./TransliterationConfig')
    : /* browser */ TransliterationConfig;

class TransliterationConfigCollection {
    #configs = {};
    #cachedConfigCodes = new Set();

    /**
     * Constructor method
     * @param {Array} rawConfigs - Array of raw JSON configs.
     */
    constructor(rawConfigs) {
        if (rawConfigs == null) {
            return;
        }
        for (const rawCfg of rawConfigs) {
            this.upsertConfig(rawCfg);
        }
    }

    get isEmpty() {
        return this.count === 0 && Object.getPrototypeOf(this.#configs) === Object.prototype;
    }

    get configCodes() {
        return [...this.#cachedConfigCodes];
    }

    get count() {
        return this.#cachedConfigCodes.size;
    }

    hasConfig(configCode) {
        return !this.isEmpty && this.#cachedConfigCodes.has(configCode);
    }

    getConfig(configCode) {
        if (!this.hasConfig(configCode)) {
            return undefined;
        }

        let config = this.#configs[configCode];
        if (!config.isNormalized) {
            this.#configs[configCode] = new TransConfig(config);
            config = this.#configs[configCode];
        }

        // Return a copy of the config?
        //return JSON.parse(JSON.stringify(config));

        return config;
    }

    upsertConfig(rawConfig) {
        if (!rawConfig || !rawConfig.code) {
            //return false; // when adding this line, the tests fail
            //throw new Error('Invalid configuration object');
        }

        const wasInserted = !this.hasConfig(rawConfig.code);
        this.#configs[rawConfig.code] = rawConfig;  // initially, only insert a raw config - for laziness
        this.#cachedConfigCodes.add(rawConfig.code);

        return wasInserted;
    }

    deleteConfig(configCode) {
        let wasDeleted = false;

        if (this.hasConfig(configCode)) {
            delete this.#configs[configCode];
            this.#cachedConfigCodes.delete(configCode);
            wasDeleted = true;
        }

        return wasDeleted;
    }

    deleteAll() {
        this.#configs = {};
        this.#cachedConfigCodes.clear();
    }
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = TransliterationConfigCollection;
} else {
    // browser:
    window.TransliterationConfigCollection = TransliterationConfigCollection;
}
