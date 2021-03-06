
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");

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

    it("should add 'object has relation' predicate for single object", function() {
        var object = appstax.object("foo", {sysObjectId:"1234"});
        query.relation("bar").has(object);
        expect(query.queryString()).equals("bar has ('1234')")
    });

    it("should add 'object has relation' predicate for multiple objects", function() {
        var object1 = appstax.object("foo", {sysObjectId:"1234"});
        var object2 = appstax.object("foo", {sysObjectId:"5678"});
        query.relation("bar").has([object1, object2]);
        expect(query.queryString()).equals("bar has ('1234','5678')")
    });

    it("should add 'object has relation' predicate for single id", function() {
        query.relation("bar").has("abc1234");
        expect(query.queryString()).equals("bar has ('abc1234')")
    });

    it("should add 'object has relation' predicate for multiple ids", function() {
        query.relation("bar").has(["abc1234", "def5678"]);
        expect(query.queryString()).equals("bar has ('abc1234','def5678')")
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
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=name%20like%20%27%25Jo%25%27%20and%20gender%3D%27female%27");
    });

    it("should send query string from query object in filter parameter", function() {
        query.string("name").contains("lex");
        query.string("gender").equals("male");
        appstax.find("friends", query);
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=name%20like%20%27%25lex%25%27%20and%20gender%3D%27male%27");
    });

    it("should send result from query function in filter parameter", function() {
        appstax.find("friends", function(query) {
            query.string("name").contains("ha");
            query.string("gender").equals("female");
        });
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=name%20like%20%27%25ha%25%27%20and%20gender%3D%27female%27");
    });

    it("should send property query in filter parameter", function() {
        appstax.find("friends", {gender:"female", hometown:"New York"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=gender%3D%27female%27%20and%20hometown%3D%27New%20York%27");
    });

    it("should send property search in filter parameter", function() {
        appstax.search("notes", {title:"music", content:"music"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/notes?filter=title%20like%20%27%25music%25%27%20or%20content%20like%20%27%25music%25%27");
    });

    it("should send multi-property search in filter parameter", function() {
        appstax.search("recipes", "burger", ["title", "description", "tags"]);
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/recipes?filter=title%20like%20%27%25burger%25%27%20or%20description%20like%20%27%25burger%25%27%20or%20tags%20like%20%27%25burger%25%27");
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

        return promise
            .then(function() {
                throw new Error("Success handler should not be called!");
            })
            .fail(function(error) {
                expect(error).to.have.property("message", "The query error");
            });
    });

    it("should send descending order as url parameters", function() {
        appstax.find("friends", "foo=bar", {order: "-foo"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&sortorder=desc&sortcolumn=foo");
    });

    it("should send ascending order as url parameters", function() {
        appstax.find("friends", "foo=bar", {order: "foo"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&sortorder=asc&sortcolumn=foo");
    });


    it("should send expand as url parameters", function() {
        appstax.find("friends", "foo=bar", {expand: 2});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&expanddepth=2");
    });

    it("should send expand as url parameters", function() {
        appstax.find("friends", "foo=bar", {expand: true});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&expanddepth=1");
    });

    it("should send multiple options as url parameters", function() {
        appstax.find("friends", "foo=bar", {expand: true, order:"-foo"});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&expanddepth=1&sortorder=desc&sortcolumn=foo");
    });

    it("should send paging as url parameters", function() {
        appstax.find("friends", "foo=bar", {page: 2, pageSize: 300});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&paging=yes&pagenum=2&pagelimit=300");
    });

    it("should send pagenum as url parameter", function() {
        appstax.find("friends", "foo=bar", {pageSize: 50});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&paging=yes&pagelimit=50");
    });


    it("should send pagelimit as url parameter", function() {
        appstax.find("friends", "foo=bar", {page: 10});
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.equal("GET");
        expect(requests[0].url).to.equal("http://localhost:3000/objects/friends?filter=foo%3Dbar&paging=yes&pagenum=10");
    });


});
