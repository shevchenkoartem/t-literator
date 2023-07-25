class ConfigHelpers {

    static Position = {
        PRE: 0,
        MID: 1,
        POST: 2
    };

    static getPositionalValue(from, position = this.Position.MID) {
        if (!Array.isArray(from)) return from;

        return from[position] ?? from[from.length - 1];
    }

    static getPositionalValue_Pre(from) {
        return this.getPositionalValue(from, this.Position.PRE);
    }

    static getPositionalValue_Mid(from) {
        return this.getPositionalValue(from, this.Position.MID);
    }

    static getPositionalValue_Post(from) {
        return this.getPositionalValue(from, this.Position.POST);
    }
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = ConfigHelpers;
} else {
    // browser:
    window.ConfigHelpers = ConfigHelpers;
}