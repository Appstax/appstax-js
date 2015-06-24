
// Why index.js? See https://github.com/xdissent/karma-browserify/issues/38#issuecomment-51657671
require("./appstax-test");
require("./datastore-test");
require("./apiclient-test");
require("./userservice-test");
require("./queries-test");
require("./permissions-test");
require("./files-test");
require("./collections-test");
require("./relations-test");
require("./request-test");
require("./socket-test");
require("./channels-test");

// Polyfill for f.bind()
Function.prototype.bind = Function.prototype.bind || function (thisp) {
    var fn = this;
    return function () {
        return fn.apply(thisp, arguments);
    };
};
