module.exports = function(config) {
    config.set({
        basePath: "",
        frameworks: ["mocha","chai"],
        files: [
            "build/appstax-test.js"
        ],
        reporters: ["progress"],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: false,
        singleRun: true,
        browsers: ["PhantomJS"]
    });
};
