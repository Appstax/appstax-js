
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");

describe("Files", function() {

    var xhr, requests;
    var apiClient;

    beforeEach(function() {
        appstax.init({appKey:"testappkey", baseUrl: "http://localhost:3000/", log:false});
        apiClient = appstax.apiClient;
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
        sinon.stub(apiClient, "formData", stubFormData);
    });

    afterEach(function() {
        xhr.restore();
        apiClient.formData.restore();
    });

    function stubFormData() {
        var items = {};
        var formData = new FormData();
        formData.append = function(name, value, filename) {
            items[name] = {
                name: name,
                value: value,
                filename: filename
            }
        }
        formData.get = function(name) {
            return items[name];
        }
        return formData;
    }

    function mockFile(filename) {
        var contents = "foo";
        var mimeType = "text/plain";
        var file;
        try {
            file = new File([contents], filename, {type: mimeType});
        } catch (e) {
            var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder;
            var builder = new BlobBuilder();
            builder.append(contents);
            file = builder.getBlob(filename, mimeType);
        }
        file.name = filename;
        return file;
    }

    it("should have read-only file name from file input", function() {
        var object = appstax.object("myobjects");
        object.attachment = appstax.file(mockFile("myattachment.doc"));
        expect(object.attachment.filename).to.equal("myattachment.doc");
        expect(function() { object.attachment.filename = "foo" }).to.throw(Error);
    });

    it("should use first file from <input type=file>", function() {
        var input = {
            nodeName: "INPUT",
            type: "file",
            files: [mockFile("something.png")]
        };

        var file = appstax.file(input);
        expect(file.filename).to.equal("something.png");
    });

    it("should return undefined if <input> has no files", function() {
        var input = {
            nodeName: "INPUT",
            type: "file",
            files: []
        };

        var file = appstax.file(input);
        expect(file).to.be.undefined;
    });

    it("should store file properties in objects", function() {
        var object = appstax.object("myobjects");
        object.file1 = appstax.file(mockFile("f0.ext"));

        object.save();

        var formData = requests[0].requestBody;
        expect(formData).to.be.instanceOf(FormData);
        var objectData = JSON.parse(formData.get("sysObjectData").value);
        expect(objectData.file1).to.have.property("sysDatatype", "file");
        expect(objectData.file1).to.have.property("filename", "f0.ext");
    });

    it("should should POST object with multipart files", function() {
        apiClient.urlToken("4321");
        var object = appstax.object("myobjects");
        object.file1 = appstax.file(mockFile("f1.pdf"));
        object.file2 = appstax.file(mockFile("f2.jpg"));
        object.prop1 = "value1";
        object.prop2 = "value2";

        var promise = object.save();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));

        expect(requests.length).to.equal(1);
        expect(requests[0].method).to.equal("POST");
        //expect(requests[0].requestHeaders["Content-Type"]).to.contain("multipart")
        var formData = requests[0].requestBody;
        expect(formData).to.be.instanceOf(FormData);
        expect(formData.get("file1").value).to.equal(appstax.files.nativeFile(object.file1));
        expect(formData.get("file2").value).to.equal(appstax.files.nativeFile(object.file2));
    });

    it("should encode file names with whitespace in url", function() {
        apiClient.urlToken("4321");
        var object = appstax.object("myobjects", {sysObjectId:"1234"});
        object.file1 = appstax.file(mockFile("file with space.png"));

        var promise = object.save();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));

        expect(requests[1].method).to.equal("PUT");
        expect(requests[1].url).to.equal("http://localhost:3000/files/myobjects/id1234/file1/file%20with%20space.png?token=4321");
    });

    it("should update status and fulfill save promise after all files finish saving", function() {
        var object = appstax.object("myobjects", {sysObjectId:"1234"});
        object.info = appstax.file(mockFile("info.pdf"));
        object.picture = appstax.file(mockFile("picture.jpg"));

        expect(appstax.files.status(object.info)).to.equal("new");
        expect(appstax.files.status(object.picture)).to.equal("new");

        var promise = object.save();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));
        window.setTimeout(function() {
            requests[1].respond(204, {});
            requests[2].respond(204, {});
        }, 100);

        expect(appstax.files.status(object.info)).to.equal("saving");
        expect(appstax.files.status(object.picture)).to.equal("saving");

        return promise.then(function(promisedObject) {
            expect(promisedObject).to.equal(promisedObject);
            expect(appstax.files.status(object.info)).to.equal("saved");
            expect(appstax.files.status(object.picture)).to.equal("saved");
        });
    });

    it("should have readonly url property with token after saving new object", function() {
        apiClient.urlToken("abc12345");
        var object = appstax.object("myobjects");
        object.picture = appstax.file(mockFile("me120x200.jpg"));

        var promise = object.save();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));

        return promise.then(function(promisedObject) {
            var url = "http://localhost:3000/files/myobjects/id1/picture/me120x200.jpg?token=abc12345";
            expect(object.picture.url).to.equal(url);
            expect(function() { object.picture.url = "foo" }).to.throw(Error);
        });
    });

    it("should have readonly url property with token after updating object (PUT file request)", function() {
        apiClient.urlToken("abc12345");
        var object = appstax.object("myobjects", {sysObjectId:"1234"});
        object.picture = appstax.file(mockFile("profile120x200.jpg"));

        var promise = object.save();
        requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));
        requests[1].respond(204, {});

        return promise.then(function(promisedObject) {
            var url = "http://localhost:3000/files/myobjects/id1/picture/profile120x200.jpg?token=abc12345";
            expect(object.picture.url).to.equal(url);
            expect(function() { object.picture.url = "foo" }).to.throw(Error);
        });
    });

    it("should not set data: url unless asked for", function(done) {
        var object = appstax.object("myobjects");
        object.picture = appstax.file(mockFile("profile120x200.jpg"));

        window.setTimeout(function() {
            expect(object.picture.url).to.equal("") // during file save
            done();
        }, 100);
    });

    it("should set data url with preview() and fulfill promise", function() {
        var picture = appstax.file(mockFile("profile120x200.jpg"));
        return picture.preview().then(function(file) {
            expect(picture.url).to.match(/^data:/);
            expect(file).to.equal(picture);
        });
    });

    it("should fill file properties when loading objects from server", function() {
        apiClient.urlToken("xyz");
        var promise = appstax.findAll("profiles");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {   sysObjectId:"001",
                profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name1", filename:"name1"},
                backgroundImage:{sysDatatype:"file", url:"files/profiles/001/backgroundImage/name2", filename:"name2"}},
            {   sysObjectId:"002",
                profileImage:{sysDatatype:"file", url:"files/profiles/002/profileImage/name3", filename:"name3"},
                backgroundImage:{sysDatatype:"file", url:"files/profiles/002/backgroundImage/name4", filename:"name4"}}
        ]}));

        return promise.then(function(objects) {
            expect(objects[0].profileImage.url).to.equal("http://localhost:3000/files/profiles/001/profileImage/name1?token=xyz");
            expect(objects[1].profileImage.url).to.equal("http://localhost:3000/files/profiles/002/profileImage/name3?token=xyz");
            expect(objects[0].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/001/backgroundImage/name2?token=xyz");
            expect(objects[1].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/002/backgroundImage/name4?token=xyz");
            expect(appstax.files.status(objects[0].profileImage)).to.equal("saved");
            expect(appstax.files.status(objects[1].profileImage)).to.equal("saved");
            expect(appstax.files.status(objects[0].backgroundImage)).to.equal("saved");
            expect(appstax.files.status(objects[1].backgroundImage)).to.equal("saved");
        });
    });

    it("should use appkey in file url when there is no url token", function() {
        apiClient.urlToken("");
        var promise = appstax.findAll("profiles");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {   sysObjectId:"001",
                profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name1", filename:"name1"},
                backgroundImage:{sysDatatype:"file", url:"files/profiles/001/backgroundImage/name2", filename:"name2"}},
            {   sysObjectId:"002",
                profileImage:{sysDatatype:"file", url:"files/profiles/002/profileImage/name3", filename:"name3"},
                backgroundImage:{sysDatatype:"file", url:"files/profiles/002/backgroundImage/name4", filename:"name4"}}
        ]}));

        return promise.then(function(objects) {
            expect(objects[0].profileImage.url).to.equal("http://localhost:3000/files/profiles/001/profileImage/name1?appkey=testappkey");
            expect(objects[1].profileImage.url).to.equal("http://localhost:3000/files/profiles/002/profileImage/name3?appkey=testappkey");
            expect(objects[0].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/001/backgroundImage/name2?appkey=testappkey");
            expect(objects[1].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/002/backgroundImage/name4?appkey=testappkey");
        });
    });

    it("should not save file when updating a loaded object", function() {
        var loadPromise = appstax.find("profiles", "001");
        requests[0].respond(200, {}, JSON.stringify({
            sysObjectId:"001",
            name: "Mr. Burns",
            profileImage:{sysDatatype:"file", url:"files/1", filename:"name1"},
            backgroundImage:{sysDatatype:"file", url:"files/2", filename:"name2"}
        }));

        return loadPromise.then(function(object) {
            object.name = "Dr. Burns";
            savePromise = object.save();
            requests[1].respond(200, {});

            return savePromise.then(function() {
                expect(requests.length).to.equal(2);
            });
        });
    });

    it("should save changed file when updating a loaded object", function() {
        var loadPromise = appstax.find("profiles", "001");
        requests[0].respond(200, {}, JSON.stringify({
            sysObjectId:"001",
            name: "Mr. Burns",
            profileImage:{sysDatatype:"file", url:"files/1", filename:"name1"},
            backgroundImage:{sysDatatype:"file", url:"files/2", filename:"name2"}
        }));

        return loadPromise.then(function(object) {
            object.backgroundImage = appstax.file(mockFile("landscape.jpg"));
            expect(appstax.files.status(object.backgroundImage)).to.equal("new");

            savePromise = object.save();
            requests[1].respond(200, {});
            requests[2].respond(200, {});

            return savePromise.then(function() {
                expect(requests.length).to.equal(3);
                expect(appstax.files.status(object.backgroundImage)).to.equal("saved");
            });
        });
    });

    it("should generate image resize url", function() {
        apiClient.urlToken("xyz");
        var promise = appstax.findAll("profiles");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {   sysObjectId:"001",
                profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name2", filename:"name2"}}
        ]}));

        return promise.then(function(objects) {
            var url1 = objects[0].profileImage.imageUrl("resize", {width:200});
            var url2 = objects[0].profileImage.imageUrl("resize", {height:300});
            var url3 = objects[0].profileImage.imageUrl("resize", {width:400, height:500});
            expect(url1).to.equal("http://localhost:3000/images/resize/200/-/profiles/001/profileImage/name2?token=xyz");
            expect(url2).to.equal("http://localhost:3000/images/resize/-/300/profiles/001/profileImage/name2?token=xyz");
            expect(url3).to.equal("http://localhost:3000/images/resize/400/500/profiles/001/profileImage/name2?token=xyz");
        });
    });

    it("should generate image crop url", function() {
        apiClient.urlToken("xyz");
        var promise = appstax.findAll("profiles");

        requests[0].respond(200, {}, JSON.stringify({objects:[
            {   sysObjectId:"001",
                profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name2", filename:"name2"}}
        ]}));

        return promise.then(function(objects) {
            var url1 = objects[0].profileImage.imageUrl("crop", {width:200});
            var url2 = objects[0].profileImage.imageUrl("crop", {height:300});
            var url3 = objects[0].profileImage.imageUrl("crop", {width:400, height:500});
            expect(url1).to.equal("http://localhost:3000/images/crop/200/-/profiles/001/profileImage/name2?token=xyz");
            expect(url2).to.equal("http://localhost:3000/images/crop/-/300/profiles/001/profileImage/name2?token=xyz");
            expect(url3).to.equal("http://localhost:3000/images/crop/400/500/profiles/001/profileImage/name2?token=xyz");
        });
    });

});
