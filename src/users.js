
var extend    = require("extend");
var Q         = require("q");

module.exports = createUsersContext;

var internalProperties = ["id", "username", "save"];

function createUsersContext(apiClient, auth, objects, hub) {

    var currentUser = null;

    init();
    return {
        restoreSession: restoreSession,
        signup: signup,
        login: login,
        logout: logout,
        requestPasswordReset: requestPasswordReset,
        changePassword: changePassword,
        currentUser: function() { return currentUser; }
    };

    function init() {
        restoreSession();
    }

    function createUser(username, properties) {
        var allProperties = extend({}, properties, {sysUsername:username});
        var user = objects.create("users", allProperties);
        return user;
    }

    function signup(username, password, arg3, arg4) {
        var defer = Q.defer();
        var properties = {};
        var login = true;
        if(typeof arg3 == "boolean") {
            login = arg3;
        }
        if(typeof arg3 == "object") {
            properties = arg3;
        } else if(typeof arg4 == "object") {
            properties = arg4;
        }
        var url = apiClient.url("/users", {}, {login:login});
        var data = extend({sysUsername:username, sysPassword:password}, properties);
        apiClient.request("post", url, data)
                 .then(function(result) {
                     var user = createUser(username, result.user);
                     if(login) {
                         user = handleSignupOrLoginSuccess(username, result);
                     }
                     defer.resolve(user);
                     hub.pub("users.signup", {user: currentUser});
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function login(arg1, arg2) {
        if(typeof arg1 == "object" && typeof arg1.provider == "string") {
            return loginWithProvider(arg1.provider);
        } else {
            return loginWithUsername(arg1, arg2);
        }
    }

    function loginWithProvider(provider) {
        var dialog = auth.open();
        return (
            getProviderConfig(provider)
                .then(dialog.run)
                .then(_sendResult)
        )

        function _sendResult(authResult) {
            if(authResult.error) {
                throw new Error(authResult.error);
            }
            var url = apiClient.url("/sessions");
            var data = {
                sysProvider: {
                    type: provider,
                    data: {
                        code: authResult.authCode,
                        redirectUri: authResult.redirectUri
                    }
                }
            }
            return apiClient.request("post", url, data)
                            .then(function(loginResult) {
                                handleSignupOrLoginSuccess(undefined, loginResult);
                                hub.pub("users.login", {user: currentUser});
                                return currentUser;
                            });
        }
    }

    function getProviderConfig(provider) {
        var url = apiClient.url("/sessions/providers/:provider", {provider: provider});
        return apiClient.request("get", url).then(function(config) {
            config.type = "oauth";
            config.redirectUri = window.location.href.split("#")[0];
            switch(provider) {
                case "facebook":
                    config.uri = "https://www.facebook.com/dialog/oauth?display=popup&client_id={clientId}&redirect_uri={redirectUri}";
                    break;
                case "google":
                    config.uri = "https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={redirectUri}&nonce={nonce}&response_type=code&scope=profile+email"
                    break;
            }
            return config;
        });
    }

    function loginWithUsername(username, password) {
        var defer = Q.defer();
        var url = apiClient.url("/sessions");
        apiClient.request("post", url, {sysUsername:username, sysPassword:password})
                 .then(function(result) {
                     handleSignupOrLoginSuccess(username, result);
                     defer.resolve(currentUser);
                     hub.pub("users.login", {user: currentUser});
                 })
                 .fail(function(error) {
                     defer.reject(error);
                 });
        return defer.promise;
    }

    function handleSignupOrLoginSuccess(username, result) {
        var id = result.user ? result.user.sysObjectId : null;
        username = username || (result.user ? result.user.sysUsername : undefined);
        storeSession(result.sysSessionId, username, id);
        currentUser = createUser(username, result.user);
        return currentUser;
    }

    function logout() {
        currentUser = null;
        apiClient.sessionId(null);
        if(typeof localStorage != "undefined") {
            localStorage.removeItem("appstax_session_" + apiClient.appKey());
        }
        hub.pub("users.logout");
    }

    function requestPasswordReset(email) {
        var url = apiClient.url("/users/reset/email");
        return apiClient.request("post", url, {email: email})
            .then(function() {
                return undefined;
            });
    }

    function changePassword(options) {
        var url = apiClient.url("/users/reset/password");
        var data = {
            username: options.username,
            password: options.password,
            pinCode:  options.code,
            login:    options.login || false
        }
        return apiClient.request("post", url, data)
            .then(function(result) {
                if(data.login) {
                    return handleSignupOrLoginSuccess(undefined, result);
                } else {
                    return undefined;
                }
            });
    }

    function storeSession(sessionId, username, id) {
        apiClient.sessionId(sessionId);
        if(typeof localStorage != "undefined") {
            localStorage.setItem("appstax_session_" + apiClient.appKey(), JSON.stringify({
                username: username,
                sessionId: sessionId,
                userId: id
            }));
        }
    }

    function restoreSession() {
        if(typeof localStorage == "undefined") {
            return;
        }
        var sessionData = localStorage.getItem("appstax_session_" + apiClient.appKey());
        if(sessionData) {
            var session = JSON.parse(sessionData);
            apiClient.sessionId(session.sessionId);
            currentUser = createUser(session.username,
                                     {sysObjectId:session.userId});
        }
    }

    function getPropertyNames(user) {
        var keys = Object.keys(user);
        internalProperties.forEach(function(internal) {
            var index = keys.indexOf(internal);
            if(index >= 0) {
                keys.splice(index, 1);
            }
        });
        return keys;
    }

    function getProperties(user) {
        var data = {};
        getPropertyNames(user).forEach(function(key) {
            data[key] = user[key];
        });
        return data;
    }
}

