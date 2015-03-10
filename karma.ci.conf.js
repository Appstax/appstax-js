
var baseConfig = require("./karma.conf");

module.exports = function(config) {
    baseConfig(config);
    config.set({
        autoWatch:false,
        singleRun:true,
        reporters:["progress","junit"],
        junitReporter: {
            outputFile: 'test-results/karma-test-results.xml'
        }
    })
}