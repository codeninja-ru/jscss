module.exports = {
    "transform": {
        "^.+\\.(ts|tsx)$": "ts-jest"
    },
    //"roots": [
    //    "<rootDir>/build"
    //],
    "testMatch": [
        "**/?(*.)+(spec|test).+(ts|tsx|js)"
    ],
    //testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    testPathIgnorePatterns: ["/build/", "/node_modules/"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    collectCoverage: true,
    moduleDirectories: ["node_modules", "src"],
};
