const NormalizedConfig = typeof window === 'undefined'
    ? /* Node.js */ require('./normalized-config')
    : /* browser */ NormalizedConfig;

class ConfigsCollection {
    #configs = {};

    constructor(rawConfigs) {
        if (rawConfigs == null) {
            return;
        }
        for (const rawCfg of rawConfigs) {
            this.upsertConfig(rawCfg);
        }
    }

    get isEmpty() {
        return Object.keys(this.#configs).length === 0
            && Object.getPrototypeOf(this.#configs) === Object.prototype;
    }

    get configCodes(){
        return Object.keys(this.#configs);
    }

    get count() {
        return this.configCodes.length;
    }

    hasConfig(configCode) {
        return !this.isEmpty && configCode in this.#configs; // TODO: choose and use a single approach everywhere: https://stackoverflow.com/questions/1098040/checking-if-a-key-exists-in-a-javascript-object
    }

    getConfig(configCode) {
        // todo: should return a copy?
        if (!this.hasConfig(configCode)) {
            return undefined;
        }

        let config = this.#configs[configCode];
        if (!config.isNormalized) {
            this.#configs[configCode] = new NormalizedConfig(config);
            config = this.#configs[configCode];
        }

        return config;
    }

    upsertConfig(rawConfig) {
        //todo: check null
        const res = !this.hasConfig(rawConfig.code);
        this.#configs[rawConfig.code] = rawConfig; // initially, insert a raw config - for lazyness

        return res; // if has inserted a new one
    }

    deleteConfig(configCode) {
        const res = this.hasConfig(configCode);
        if (res) {
            delete this.#configs[configCode];
        }

        return res; // if has deleted
    }

    deleteAll() {
        this.#configs = {};
    }
}

// If it's Node.js:
if (typeof window === 'undefined') { module.exports = ConfigsCollection; }