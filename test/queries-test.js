
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("kew");

describe("Object queries", function() {

    var xhr, requests;
    var query;

    beforeEach(function() {
        appstax.init({baseUrl: "http://localhost:3000/", log:false});
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
        query = appstax.objects.createQuery();
    });

    afterEach(function() {
        xhr.restore();
    });

    it("should create empty query", function() {
        var query = appstax.objects.createQuery();
        expect(query).to.exist;
        expect(query.queryString()).equals("");
    });

    it("should create simple query with string", function() {
        var query = appstax.objects.createQuery("foo='bar'");
        expect(query.queryString()).equals("foo='bar'");
    });

    it("should add 'string property equals' predicate", function() {
        query.string("zoo").equals("baz");
        expect(query.queryString()).equals("zoo='baz'");
    });

    it("should add 'string property contains' predicate", function() {
        query.string("mooz").contains("oo");
        expect(query.queryString()).equals("mooz like '%oo%'");
    });

    it("should join predicates with 'and' by default", function() {
        query.string("zoo").equals("baz");
        query.string("mooz").contains("oo");
        expect(query.queryString()).equals("zoo='baz' and mooz like '%oo%'");
    });

    it("should join predicates with 'or' when specified", function() {
        query.string("zoo").equals("bazz");
        query.string("mooz").contains("ooz");
        query.operator("or");
        expect(query.queryString()).equals("zoo='bazz' or mooz like '%ooz%'");
    });

    it("should send querystring in filter parameter", function() {
        appstax.find("friends", "name like '%Jo%' and gender='female'");
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=name+like+%27%25Jo%25%27+and+gender%3D%27female%27");
    });

    it("should send query string from query object in filter parameter", function() {
        query.string("name").contains("lex");
        query.string("gender").equals("male");
        appstax.find("friends", query);
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=name+like+%27%25lex%25%27+and+gender%3D%27male%27");
    });

    it("should send result from query function in filter parameter", function() {
        appstax.find("friends", function(query) {
            query.string("name").contains("ha");
            query.string("gender").equals("female");
        });
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=name+like+%27%25ha%25%27+and+gender%3D%27female%27");
    });

    it("should send property query in filter parameter", function() {
        appstax.find("friends", {gender:"female", hometown:"New York"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=gender%3D%27female%27+and+hometown%3D%27New+York%27");
    });

    it("should send property search in filter parameter", function() {
        appstax.search("notes", {title:"music", content:"music"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/notes?filter=title+like+%27%25music%25%27+or+content+like+%27%25music%25%27");
    });

    it("should send multi-property search in filter parameter", function() {
        appstax.search("recipes", "burger", ["title", "description", "tags"]);
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/recipes?filter=title+like+%27%25burger%25%27+or+description+like+%27%25burger%25%27+or+tags+like+%27%25burger%25%27");
    });

    it("should fulfill promise with queried objects", function() {
        var promise = appstax.find("myobjects", "foo='bar'");

        var req = requests[0];
        req.respond(200, {}, JSON.stringify({objects:[
            {sysObjectId:"1234", foo:"bar", sysCreated:"0001", sysUpdated:"0002"},
            {sysObjectId:"5678", foo:"bar", sysCreated:"0003", sysUpdated:"0004"}
        ]}));

        return promise.then(function(objects) {
            expect(objects.length).equals(2);
            expect(objects[0]).to.have.property("foo", "bar");
            expect(objects[1]).to.have.property("foo", "bar");
            expect(objects[0]).to.have.property("id", "1234");
            expect(objects[1]).to.have.property("id", "5678");
            expect(objects[0]).to.have.property("collectionName", "myobjects");
            expect(objects[1]).to.have.property("collectionName", "myobjects");
            expect(objects[0]).to.not.have.property("sysObjectId");
            expect(objects[1]).to.not.have.property("sysObjectId");
            expect(objects[0]).to.not.have.property("sysCreated");
            expect(objects[1]).to.not.have.property("sysCreated");
            expect(objects[0]).to.not.have.property("sysUpdated");
            expect(objects[1]).to.not.have.property("sysUpdated");
        });
    });

    it("should reject promise with error when query fails", function() {
        var promise = appstax.find("objz", "fooz='bz'");

        requests[0].respond(422, {}, JSON.stringify({errorMessage:"The query error"}));

        return promise.fail(function(error) {
            expect(error).to.have.property("message", "The query error");
        });
    });

});
