
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");

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

    it("should store file properties in objects", function(done) {
        var object = appstax.object("myobjects");
        object.file1 = appstax.file(mockFile("f0.ext"));

        object.save();

        setTimeout(function() {
            var formData = requests[0].requestBody;
            expect(formData).to.be.instanceOf(FormData);
            var objectData = JSON.parse(formData.get("sysObjectData").value);
            expect(objectData.file1).to.have.property("sysDatatype", "file");
            expect(objectData.file1).to.have.property("filename", "f0.ext");
            done();
        }, 10);
    });

    it("should should POST object with multipart files", function(done) {
        apiClient.urlToken("4321");
        var object = appstax.object("myobjects");
        object.file1 = appstax.file(mockFile("f1.pdf"));
        object.file2 = appstax.file(mockFile("f2.jpg"));
        object.prop1 = "value1";
        object.prop2 = "value2";

        object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            //expect(requests[0].requestHeaders["Content-Type"]).to.contain("multipart")
            var formData = requests[0].requestBody;
            expect(formData).to.be.instanceOf(FormData);
            expect(formData.get("file1").value).to.equal(appstax.files.nativeFile(object.file1));
            expect(formData.get("file2").value).to.equal(appstax.files.nativeFile(object.file2));
            done();
        }, 10);
    });

    it("should encode file names with whitespace in url", function(done) {
        apiClient.urlToken("4321");
        var object = appstax.object("myobjects", {sysObjectId:"1234"});
        object.file1 = appstax.file(mockFile("file with space.png"));

        object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));
            setTimeout(function() {
                expect(requests[1].method).to.equal("PUT");
                expect(requests[1].url).to.equal("http://localhost:3000/files/myobjects/id1234/file1/file%20with%20space.png?token=4321");
                done();
            }, 10);
        }, 10);
    });

    it("should update status and fulfill save promise after all files finish saving", function(done) {
        var object = appstax.object("myobjects", {sysObjectId:"1234"});
        object.info = appstax.file(mockFile("info.pdf"));
        object.picture = appstax.file(mockFile("picture.jpg"));

        expect(appstax.files.status(object.info)).to.equal("new");
        expect(appstax.files.status(object.picture)).to.equal("new");

        var promise = object.save();

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));
            setTimeout(function() {
                expect(appstax.files.status(object.info)).to.equal("saving");
                expect(appstax.files.status(object.picture)).to.equal("saving");
                requests[1].respond(204, {});
                requests[2].respond(204, {});
            }, 10);
        }, 10);

        promise.then(function(promisedObject) {
            expect(promisedObject).to.equal(promisedObject);
            expect(appstax.files.status(object.info)).to.equal("saved");
            expect(appstax.files.status(object.picture)).to.equal("saved");
            done();
        }).done();
    });

    it("should have readonly url property with token after saving new object", function(done) {
        apiClient.urlToken("abc12345");
        var object = appstax.object("myobjects");
        object.picture = appstax.file(mockFile("me120x200.jpg"));

        var promise = object.save();
        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));
        }, 10);

        promise.then(function(promisedObject) {
            var url = "http://localhost:3000/files/myobjects/id1/picture/me120x200.jpg?token=abc12345";
            expect(object.picture.url).to.equal(url);
            expect(function() { object.picture.url = "foo" }).to.throw(Error);
            done();
        }).done();
    });

    it("should have readonly url property with token after updating object (PUT file request)", function(done) {
        apiClient.urlToken("abc12345");
        var object = appstax.object("myobjects", {sysObjectId:"1234"});
        object.picture = appstax.file(mockFile("profile120x200.jpg"));

        var promise = object.save();
        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));
            setTimeout(function() {
                requests[1].respond(204, {});
            }, 10);
        }, 10);

        promise.then(function(promisedObject) {
            var url = "http://localhost:3000/files/myobjects/id1/picture/profile120x200.jpg?token=abc12345";
            expect(object.picture.url).to.equal(url);
            expect(function() { object.picture.url = "foo" }).to.throw(Error);
            done();
        }).done();
    });

    it("should not set data: url unless asked for", function(done) {
        var object = appstax.object("myobjects");
        object.picture = appstax.file(mockFile("profile120x200.jpg"));

        setTimeout(function() {
            expect(object.picture.url).to.equal("") // during file save
            done();
        }, 100);
    });

    it("should set data url with preview() and fulfill promise", function(done) {
        var picture = appstax.file(mockFile("profile120x200.jpg"));
        picture.preview().then(function(file) {
            expect(picture.url).to.match(/^data:/);
            expect(file).to.equal(picture);
            done();
        }).done();
    });

    it("should fill file properties when loading objects from server", function(done) {
        apiClient.urlToken("xyz");
        var promise = appstax.findAll("profiles");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {   sysObjectId:"001",
                    profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name1", filename:"name1"},
                    backgroundImage:{sysDatatype:"file", url:"files/profiles/001/backgroundImage/name2", filename:"name2"}},
                {   sysObjectId:"002",
                    profileImage:{sysDatatype:"file", url:"files/profiles/002/profileImage/name3", filename:"name3"},
                    backgroundImage:{sysDatatype:"file", url:"files/profiles/002/backgroundImage/name4", filename:"name4"}}
            ]}));
        }, 10);

        promise.then(function(objects) {
            expect(objects[0].profileImage.url).to.equal("http://localhost:3000/files/profiles/001/profileImage/name1?token=xyz");
            expect(objects[1].profileImage.url).to.equal("http://localhost:3000/files/profiles/002/profileImage/name3?token=xyz");
            expect(objects[0].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/001/backgroundImage/name2?token=xyz");
            expect(objects[1].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/002/backgroundImage/name4?token=xyz");
            expect(appstax.files.status(objects[0].profileImage)).to.equal("saved");
            expect(appstax.files.status(objects[1].profileImage)).to.equal("saved");
            expect(appstax.files.status(objects[0].backgroundImage)).to.equal("saved");
            expect(appstax.files.status(objects[1].backgroundImage)).to.equal("saved");
            done();
        });
    });

    it("should use appkey in file url when there is no url token", function(done) {
        apiClient.urlToken("");
        var promise = appstax.findAll("profiles");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {   sysObjectId:"001",
                    profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name1", filename:"name1"},
                    backgroundImage:{sysDatatype:"file", url:"files/profiles/001/backgroundImage/name2", filename:"name2"}},
                {   sysObjectId:"002",
                    profileImage:{sysDatatype:"file", url:"files/profiles/002/profileImage/name3", filename:"name3"},
                    backgroundImage:{sysDatatype:"file", url:"files/profiles/002/backgroundImage/name4", filename:"name4"}}
            ]}));
        }, 10);

        promise.then(function(objects) {
            expect(objects[0].profileImage.url).to.equal("http://localhost:3000/files/profiles/001/profileImage/name1?appkey=testappkey");
            expect(objects[1].profileImage.url).to.equal("http://localhost:3000/files/profiles/002/profileImage/name3?appkey=testappkey");
            expect(objects[0].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/001/backgroundImage/name2?appkey=testappkey");
            expect(objects[1].backgroundImage.url).to.equal("http://localhost:3000/files/profiles/002/backgroundImage/name4?appkey=testappkey");
            done();
        }).done();
    });

    it("should not save unchanged file when updating a loaded object", function(done) {
        var loadPromise = appstax.find("profiles", "001");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({
                sysObjectId:"001",
                name: "Mr. Burns",
                profileImage:{sysDatatype:"file", url:"files/1", filename:"name1"},
                backgroundImage:{sysDatatype:"file", url:"files/2", filename:"name2"}
            }));
        }, 10);

        loadPromise.then(function(object) {
            object.name = "Dr. Burns";
            savePromise = object.save();
            setTimeout(function() {
                requests[1].respond(200, {});
            }, 10);

            savePromise.then(function() {
                expect(requests.length).to.equal(2);
                done();
            });
        });
    });

    it("should save changed file when updating a loaded object", function(done) {
        var loadPromise = appstax.find("profiles", "001");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({
                sysObjectId:"001",
                name: "Mr. Burns",
                profileImage:{sysDatatype:"file", url:"files/1", filename:"name1"},
                backgroundImage:{sysDatatype:"file", url:"files/2", filename:"name2"}
            }));
        }, 10);

        loadPromise.then(function(object) {
            object.backgroundImage = appstax.file(mockFile("landscape.jpg"));
            expect(appstax.files.status(object.backgroundImage)).to.equal("new");

            savePromise = object.save();
            setTimeout(function() {
                requests[1].respond(200, {});
                setTimeout(function() {
                    requests[2].respond(200, {});
                }, 10);
            }, 10);

            savePromise.then(function() {
                expect(requests.length).to.equal(3);
                expect(appstax.files.status(object.backgroundImage)).to.equal("saved");
                done();
            }).done();
        }).done();
    });

    it("should generate image resize url", function(done) {
        apiClient.urlToken("xyz");
        var promise = appstax.findAll("profiles");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {   sysObjectId:"001",
                    profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name2", filename:"name2"}}
            ]}));
        }, 10);

        promise.then(function(objects) {
            var url1 = objects[0].profileImage.imageUrl("resize", {width:200});
            var url2 = objects[0].profileImage.imageUrl("resize", {height:300});
            var url3 = objects[0].profileImage.imageUrl("resize", {width:400, height:500});
            expect(url1).to.equal("http://localhost:3000/images/resize/200/-/profiles/001/profileImage/name2?token=xyz");
            expect(url2).to.equal("http://localhost:3000/images/resize/-/300/profiles/001/profileImage/name2?token=xyz");
            expect(url3).to.equal("http://localhost:3000/images/resize/400/500/profiles/001/profileImage/name2?token=xyz");
            done();
        }).done();
    });

    it("should generate image crop url", function(done) {
        apiClient.urlToken("xyz");
        var promise = appstax.findAll("profiles");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({objects:[
                {   sysObjectId:"001",
                    profileImage:{sysDatatype:"file", url:"files/profiles/001/profileImage/name2", filename:"name2"}}
            ]}));
        }, 10);

        promise.then(function(objects) {
            var url1 = objects[0].profileImage.imageUrl("crop", {width:200});
            var url2 = objects[0].profileImage.imageUrl("crop", {height:300});
            var url3 = objects[0].profileImage.imageUrl("crop", {width:400, height:500});
            expect(url1).to.equal("http://localhost:3000/images/crop/200/-/profiles/001/profileImage/name2?token=xyz");
            expect(url2).to.equal("http://localhost:3000/images/crop/-/300/profiles/001/profileImage/name2?token=xyz");
            expect(url3).to.equal("http://localhost:3000/images/crop/400/500/profiles/001/profileImage/name2?token=xyz");
            done();
        }).done();
    });

    it("should provide upload progress when POST'ing object and file", function(done) {
        apiClient.urlToken("4321");
        var object = appstax.object("myobjects");
        object.file1 = appstax.file(mockFile("f1.pdf"));
        object.prop1 = "value1";

        var progressSpy = sinon.spy();
        var promise = object.save().progress(progressSpy);


        setTimeout(function() {
            requests[0].upload.dispatchEvent(new sinon.ProgressEvent("progress", {loaded: 58, total: 100}));
            setTimeout(function() {
                requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));
            }, 10);
        }, 10);

        promise.then(function() {
            expect(progressSpy.callCount).to.equal(2);
            expect(progressSpy.args[0][0]).to.have.property("percent", 58);
            expect(progressSpy.args[1][0]).to.have.property("percent", 100);
            done();
        }).done();
    });

    it("should provide upload progress when PUT'ing multiple files", function(done) {
        apiClient.urlToken("4321");
        var object = appstax.object("myobjects", {sysObjectId: "10023"});
        object.file1 = appstax.file(mockFile("f1.pdf"));
        object.file2 = appstax.file(mockFile("f2.pdf"));
        object.file3 = appstax.file(mockFile("f3.pdf"));

        var progressSpy = sinon.spy();
        var promise = object.save().progress(progressSpy);

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1234"}));
            setTimeout(function() {
                expect(requests.length).to.equal(4);
                _progress(10, 1, 30, 100); // 30%  0%  0%  ->  10%
                _progress(20, 2, 30, 100); // 30% 30%  0%  ->  20%
                _progress(30, 3, 30, 100); // 30% 30% 30%  ->  30%
                setTimeout(function() {
                    requests[1].respond(204, {});
                    requests[2].respond(204, {});
                    requests[3].respond(204, {});
                }, 200);
            }, 10);
        }, 10);

        promise.then(function() {
            expect(progressSpy.callCount).to.equal(6);
            expect(progressSpy.args[0][0]).to.have.property("percent",  10); //  30%   0%   0%  ->  10%
            expect(progressSpy.args[1][0]).to.have.property("percent",  20); //  30%  30%   0%  ->  20%
            expect(progressSpy.args[2][0]).to.have.property("percent",  30); //  30%  30%  30%  ->  30%
            expect(progressSpy.args[3][0]).to.have.property("percent",  53); // 100%  30%  30%  ->  53.3333%
            expect(progressSpy.args[4][0]).to.have.property("percent",  77); // 100% 100%  30%  ->  76.6666%
            expect(progressSpy.args[5][0]).to.have.property("percent", 100); // 100% 100% 100%  ->  100%
            done();
        }).done();

        function _progress(delay, index, loaded, total) {
            setTimeout(function() {
                requests[index].upload.dispatchEvent(new sinon.ProgressEvent("progress", {loaded: loaded, total: total}));
            }, delay);
        }
    });

});
