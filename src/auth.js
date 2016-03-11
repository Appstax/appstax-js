
var Q = require("q");

module.exports = createAuthContext;

function createAuthContext() {

    return {
        open: open
    }

    function open() {
        var popup = openPopup();
        if(!popup) {
            throw new Error("Popup blocked");
        }

        return {
            run: run
        }

        function run(options) {
            return Q.Promise(function(resolve, reject) {
                var url = options.uri;
                url = url.replace("{clientId}", encodeURIComponent(options.clientId));
                url = url.replace("{redirectUri}", encodeURIComponent(options.redirectUri));

                popup.location.href = url;

                var interval = setInterval(function() {
                    if(!popup.opener) {
                        reject(new Error("Authentication cancelled"));
                        clearInterval(interval);
                    } else {
                        var params = getRedirectParams(popup);
                        if(params) {
                            popup.close();
                            resolve({
                                error: params.error_description,
                                authCode: params.code,
                                redirectUri: options.redirectUri
                            });
                            clearInterval(interval);
                        }
                    }
                }, 100);
            });
        }
    }

    function openPopup(url) {
        var popup = window.open("", "_blank", "width=800,height=500");
        if(popup && popup.focus) {
            popup.focus();
        }
        return popup;
    }

    function getRedirectParams(popup) {
        try {
            if(popup.location && typeof popup.location.search == "string" && popup.location.search.length > 0) {
                var paramString = popup.location.search;
                if(paramString.indexOf("?") == 0) {
                    paramString = paramString.replace("?", "");
                }

                var params = {};
                paramString.split("&").forEach(function(pair) {
                    var keyValue = pair.split("=");
                    params[keyValue[0]] = keyValue[1];
                });

                return params;
            }
        } catch(e) {}
    }
}
