class StringUtils {
    // TODO: consider StringValueOrArrayHelpers.toUpperCase - should it be modified and used instead?
    static toUpperCase(v) {
        return v.toLocaleUpperCase();
    }

    static toLowerCase(v) {
        return v.toLocaleLowerCase();
    }

    static replaceLettersFromStr(v, lettersToReplace, replacement) {
        return lettersToReplace.reduce((accumulated, letter) => accumulated.replaceAll(letter, replacement), v);
    }

    static removeLettersFromStr(v, lettersToRemove) {
        return this.replaceLettersFromStr(v, lettersToRemove, '');
    }
}

// Exporting class:
if (typeof window === 'undefined') {
    // Node.js:
    module.exports = StringUtils;
} else {
    // browser:
    window.StringUtils = StringUtils;
}