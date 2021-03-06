
var extend      = require("extend");
var objects     = require("./objects");
var users       = require("./users");
var files       = require("./files");
var collections = require("./collections");
var apiClient   = require("./apiclient");
var request     = require("./request");
var channels    = require("./channels");
var models      = require("./models");
var auth        = require("./auth");
var createHub   = require("./hub");

var defaults = {
    baseUrl: "https://appstax.com/api/latest/",
    log: log
}

var mainContext = createContext(defaults);
module.exports = mainContext;
module.exports.app = createContext;

function createContext(options) {
    var context = { init: init };
    var config  = {};
    var hub = createHub();

    init(options);
    return context;

    function init(options) {
        if(options == null) {
            return;
        }

        if(typeof options === "string") {
            options = {appKey:options};
        }
        config = extend({}, defaults, config, options);
        if(config.log === false) { config.log = function() {} }

        // init modules
        context.apiClient   = apiClient({baseUrl: config.baseUrl, appKey: config.appKey, log: config.log});
        context.auth        = auth();
        context.files       = files(context.apiClient);
        context.collections = collections();
        context.objects     = objects(context.apiClient, context.files, context.collections);
        context.users       = users(context.apiClient, context.auth, context.objects, hub);
        context.request     = request(context.apiClient)
        context.channels    = channels(context.apiClient.socket(), context.objects);
        context.models      = models(context.objects, context.users, context.channels, context.apiClient.socket(), hub);

        // expose shortcuts
        context.object               = context.objects.createObject;
        context.status               = context.objects.getObjectStatus;
        context.findAll              = context.objects.findAll;
        context.find                 = context.objects.find;
        context.search               = context.objects.search;
        context.signup               = context.users.signup;
        context.login                = context.users.login;
        context.logout               = context.users.logout;
        context.currentUser          = context.users.currentUser;
        context.requestPasswordReset = context.users.requestPasswordReset;
        context.changePassword       = context.users.changePassword;
        context.collection           = context.collections.collection;
        context.file                 = context.files.createFile;
        context.sessionId            = context.apiClient.sessionId;
        context.channel              = context.channels.getChannel;
        context.model                = context.models.create;
        context.disconnect           = function() { context.apiClient.socket().disconnect(); }
    }
}

function log(level, message) {
    if(console && console[level]) {
        console[level].apply(console, Array.prototype.slice.call(arguments, 1));
    }
}

