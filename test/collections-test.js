
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");

describe("Collections", function() {

    var xhr, requests;
    var apiClient;

    beforeEach(function() {
        appstax.init({baseUrl: "http://localhost:3000/", log:false});
        apiClient = appstax.apiClient;
        apiClient.urlToken("4321");
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    });

    afterEach(function() {
        xhr.restore();
    });

    it("should set initial property values", function() {
        appstax.collection("myCollection", {
            prop0:"foobar",
            prop1:"string",
            prop2:"number",
            prop3:"array",
            prop4:"file",
            prop5:{type:"relation", relation:"single"},
            prop6:{type:"relation", relation:"array"}
        });

        var object = appstax.object("myCollection");

        expect(object.prop0).to.not.exist;
        expect(object.prop1).to.equal("");
        expect(object.prop2).to.equal(0);
        expect(object.prop3).to.be.instanceof(Array);
        expect(object.prop4.url).to.equal("");
        expect(object.prop4.filename).to.equal("");
        expect(object.prop5).to.be.undefined
        expect(object.prop6).to.be.instanceof(Array);
    });

    it("should fill in missing default values from server", function() {
        appstax.collection("myCollection", {
            prop1:"string",
            prop2:"number",
            prop3:"array",
            prop4:"file",
            prop5:{type:"relation", relation:"array"}
        });

        var promise = appstax.findAll("myCollection");

        var req = requests[0];
        req.respond(200, {}, JSON.stringify({objects:[
            {sysObjectId:"000", prop1:"foo"},
            {sysObjectId:"001", prop2:1001},
            {sysObjectId:"002", prop3:["apples", "pears"]},
            {sysObjectId:"003", prop4:{sysDatatype:"file", url:"files/myCollection/003/prop4/name1", filename:"name1"}},
            {sysObjectId:"004", prop5:{sysDatatype:"relation", sysRelationType:"array", sysObjectIds:[]}}
        ]}));

        return promise.then(function(objects) {
            expect(objects.length).equals(5);

            expect(objects[0].prop1).to.equal("foo");
            expect(objects[0].prop2).to.equal(0);
            expect(objects[0].prop3).to.be.empty;
            expect(objects[0].prop4.url).to.equal("");
            expect(objects[0].prop4.filename).to.equal("");
            expect(objects[0].prop5.length).to.equal(0);

            expect(objects[1].prop1).to.equal("");
            expect(objects[1].prop2).to.equal(1001);
            expect(objects[1].prop3).to.be.empty;
            expect(objects[1].prop4.url).to.equal("");
            expect(objects[1].prop4.filename).to.equal("");
            expect(objects[1].prop5.length).to.equal(0);

            expect(objects[2].prop1).to.equal("");
            expect(objects[2].prop2).to.equal(0);
            expect(objects[2].prop3).to.contain("apples");
            expect(objects[2].prop3).to.contain("pears");
            expect(objects[2].prop4.url).to.equal("");
            expect(objects[2].prop4.filename).to.equal("");
            expect(objects[2].prop5.length).to.equal(0);

            expect(objects[3].prop1).to.equal("");
            expect(objects[3].prop2).to.equal(0);
            expect(objects[3].prop3).to.be.empty;
            expect(objects[3].prop4.url).to.equal("http://localhost:3000/files/myCollection/003/prop4/name1?token=4321");
            expect(objects[3].prop4.filename).to.equal("name1");
            expect(objects[3].prop5.length).to.equal(0);

            expect(objects[4].prop1).to.equal("");
            expect(objects[4].prop2).to.equal(0);
            expect(objects[4].prop3).to.be.empty;
            expect(objects[4].prop4.url).to.equal("");
            expect(objects[4].prop4.filename).to.equal("");
            expect(objects[4].prop5.length).to.equal(0);
        });
    });

});
