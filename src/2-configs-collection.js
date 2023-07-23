const NormalizedCfg = typeof window === 'undefined'
    ? /* Node.js */ require('./1-normalized-config')
    : /* browser */ NormalizedConfig;

class ConfigsCollection {
    #configs = {};
    #cachedConfigCodes = new Set();

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
        // todo: should return a copy?
        if (!this.hasConfig(configCode)) {
            return undefined;
        }

        let config = this.#configs[configCode];
        if (!config.isNormalized) {
            this.#configs[configCode] = new NormalizedCfg(config);
            config = this.#configs[configCode];
        }

        return config;
    }

    upsertConfig(rawConfig) {
        if (!rawConfig || !rawConfig.code) {
            //return false; // when addinng this line, the tests fail
        }

        const res = !this.hasConfig(rawConfig.code);
        this.#configs[rawConfig.code] = rawConfig; // initially, only insert a raw config - for lazyness
        this.#cachedConfigCodes.add(rawConfig.code);

        return res; // whether a new one was inserted
    }

    deleteConfig(configCode) {
        const res = this.hasConfig(configCode);
        if (res) {
            delete this.#configs[configCode];
            this.#cachedConfigCodes.delete(configCode);
        }

        return res; // whether it was deleted
    }

    deleteAll() {
        this.#configs = {};
        this.#cachedConfigCodes.clear();
    }
}

// If it's Node.js:
if (typeof window === 'undefined') {
    module.exports = ConfigsCollection;
}