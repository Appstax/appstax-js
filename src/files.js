
var Q         = require("kew");
var extend    = require("extend");

module.exports = createFilesContext;

function createFilesContext(apiClient) {
    var internalFiles = [];

    return {
        create: createFile,
        isFile: isFile,
        saveFile: saveFile,
        status: fileStatus,
        urlForFile: urlForFile,
        nativeFile: getNativeFile,
        createFile: createFile
    }

    function createFile(options) {
        var file = Object.create({});
        var internal;

        if(options instanceof Blob) {
            var nativeFile = options;
            internal = createInternalFile(file, {
                filename: nativeFile.name,
                nativeFile: nativeFile
            });
        } else {
            internal = createInternalFile(file, options);
            internal.status = "saved";
        }

        if(file && internal) {
            Object.defineProperty(file, "filename", { get: function() { return internal.filename; }, enumerable:true });
            Object.defineProperty(file, "url", { get: function() { return internal.url; }, enumerable:true });
            Object.defineProperty(file, "preview", { value: function() { return previewFile(internal); }});
            Object.defineProperty(file, "imageUrl", { value: function(operation, options) { return imageUrl(internal, operation, options); }});
        } else {
            throw new Error("Invalid file options");
        }
        return file;
    }

    function createInternalFile(file, options) {
        var internal = {
            file: file,
            filename: options.filename,
            nativeFile: options.nativeFile,
            url: options.url || "",
            status: "new"
        }
        internalFiles.push(internal);
        return internal;
    }

    function previewFile(internalFile) {
        if(!internalFile.previewPromise) {
            var defer = Q.defer();
            var reader = new FileReader();
            reader.onload = function(event) {
                internalFile.url = event.target.result;
                defer.resolve(internalFile.file);
            }
            reader.readAsDataURL(internalFile.nativeFile);
            internalFile.previewPromise = defer.promise;
        }
        return internalFile.previewPromise;
    }

    function imageUrl(internalFile, operation, options) {
        var o = extend({
            width: "-",
            height: "-"
        }, options);

        return internalFile.url.replace("/files/", "/images/" + operation + "/" + o.width + "/" + o.height + "/");
    }

    function getInternalFile(file) {
        for(var i = 0; i < internalFiles.length; i++) {
            if(internalFiles[i].file == file) {
                return internalFiles[i];
            }
        }
        return null;
    }

    function saveFile(collectionName, objectId, propertyName, file) {
        var defer = Q.defer();
        var internal = getInternalFile(file);
        internal.status = "saving";
        var url = urlForFile(collectionName, objectId, propertyName, file.filename);
        var data = new FormData();
        data.append("file", internal.nativeFile);
        apiClient.request("put", url, data).then(function(response) {
            internal.status = "saved";
            internal.url = url;
            defer.resolve(file);
        });
        return defer.promise;
    }

    function urlForFile(collectionName, objectId, propertyName, filename) {
        if(!filename) {
            return "";
        }
        var tokenKey = "token";
        var tokenValue = apiClient.urlToken();
        if(tokenValue.length < 2) {
            tokenKey = "appkey";
            tokenValue = apiClient.appKey();
        }
        return apiClient.url("/files/:collectionName/:objectId/:propertyName/:filename?:tokenKey=:tokenValue", {
            collectionName: collectionName,
            objectId: objectId,
            propertyName: propertyName,
            filename: filename,
            tokenKey: tokenKey,
            tokenValue: tokenValue
        })
    }

    function getNativeFile(file) {
        var nativeFile = null;
        var internal = getInternalFile(file);
        if(internal != null) {
            nativeFile = internal.nativeFile;
        }
        return nativeFile;
    }

    function isFile(file) {
        return getInternalFile(file) != null;
    }

    function fileStatus(file, status) {
        if(typeof status === "string") {
            getInternalFile(file).status = status;
        }
        return getInternalFile(file).status;
    }
}
