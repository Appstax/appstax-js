
var appstax = require("../src/appstax");
var normalizer = require("../src/normalizer");


describe("Object normalizer", function() {

    beforeEach(function() {
        appstax.init("foo");
    });

    it("should return non-appstax values untouched", function() {
        var n = normalizer(appstax.objects);

        expect(n.normalize({foo:"bar"})).deep.equals({foo:"bar"});
        expect(n.normalize(undefined)).equals(undefined);
    });

    it("should return oldest object reference", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00"});
        var obj1b = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:01"});

        var n1 = normalizer(appstax.objects);
        var n1a = n1.normalize(obj1a);
        var n1b = n1.normalize(obj1b);

        var n2 = normalizer(appstax.objects);
        var n2b = n2.normalize(obj1b);
        var n2a = n2.normalize(obj1a);

        expect(obj1a).not.equals(obj1b);
        expect(n1a).equals(obj1a);
        expect(n1b).equals(obj1a);
        expect(n2a).equals(obj1b);
        expect(n2b).equals(obj1b);
    });

    it("should use values from most recently updated object", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00", value: "1a"});
        var obj1b = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:01", value: "1b"});

        var n = normalizer(appstax.objects);
        n.normalize(obj1a);
        n.normalize(obj1b);

        expect(obj1a).not.equals(obj1b);
        expect(obj1a.value).equals("1b");
        expect(obj1b.value).equals("1b");
        expect(obj1a.updated.getTime()).equals(obj1b.updated.getTime());
    });

    it("should use values from new object when update date is missing", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", value: "1a"});
        var obj1b = appstax.object("coll1", {sysObjectId:"id1", value: "1b"});

        var n = normalizer(appstax.objects);
        n.normalize(obj1a);
        n.normalize(obj1b);

        expect(obj1a).not.equals(obj1b);
        expect(obj1a.value).equals("1b");
        expect(obj1b.value).equals("1b");
    });

    it("should normalize single related objects", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00", value: "1a"});
        var obj2a = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2a"});
        var obj2b = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2b"});

        obj1a.obj2 = obj2b;

        var n = normalizer(appstax.objects);
        n.normalize(obj2a);
        n.normalize(obj1a, 1);

        expect(obj1a.obj2).equals(obj2a);
    });

    it("should normalize array related objects", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00", value: "1a"});
        var obj2a = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2a"});
        var obj2b = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2b"});

        obj1a.obj2 = [obj2b];

        var n = normalizer(appstax.objects);
        n.normalize(obj2a);
        n.normalize(obj1a, 1);

        expect(obj1a.obj2[0]).equals(obj2a);
    });

    it("should normalize deep related objects", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00", value: "1a"});
        var obj2a = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2a"});
        var obj2b = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2b"});
        var obj3a = appstax.object("coll3", {sysObjectId:"id3", sysUpdated: "2016-01-01T10:02", value: "3a"});
        var obj3b = appstax.object("coll3", {sysObjectId:"id3", sysUpdated: "2016-01-01T10:02", value: "3b"});

        obj1a.obj2 = [obj2b];
        obj2b.obj3 = obj3b;

        var n = normalizer(appstax.objects);
        n.normalize(obj2a);
        n.normalize(obj3a);
        n.normalize(obj1a, 2);

        expect(obj1a.obj2[0].obj3).equals(obj3a);
    });

    it("should keep old expanded relations when newer object is unexpanded", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00", value: "1a"});
        var obj2a = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2a"});
        var obj3a = appstax.object("coll2", {sysObjectId:"id3", sysUpdated: "2016-01-01T10:04", value: "3a"});
        var obj3b = appstax.object("coll2", {sysObjectId:"id3", sysUpdated: "2016-01-01T10:04", value: "3b"});

        obj1a.obj2 = obj2a;
        obj3a.obj1 = obj1a;

        var obj1b = appstax.object("coll1", {
            sysObjectId:"id1",
            sysUpdated: "2016-01-01T10:05",
            value: "1b",
            obj2: {
                sysDatatype: "relation",
                sysCollection: "coll2",
                sysRelationType: "single",
                sysObjects: ["id2"]
            }
        });

        obj3b.obj1 = obj1b;

        var n = normalizer(appstax.objects);
        n.normalize(obj1a, 1);
        n.normalize(obj3b, 1);

        expect(obj1a.obj2).equals(obj2a);
        expect(obj3b.obj1).equals(obj1a);
        expect(obj3b.obj1.obj2).equals(obj2a);
        expect(obj1a.value).equals("1b");
        expect(obj1b.value).equals("1b");
    });

    it("should keep old expanded array relations when newer object is unexpanded", function() {
        var obj1a = appstax.object("coll1", {sysObjectId:"id1", sysUpdated: "2016-01-01T10:00", value: "1a"});
        var obj2a = appstax.object("coll2", {sysObjectId:"id2", sysUpdated: "2016-01-01T10:02", value: "2a"});
        var obj3a = appstax.object("coll2", {sysObjectId:"id3", sysUpdated: "2016-01-01T10:04", value: "3a"});
        var obj3b = appstax.object("coll2", {sysObjectId:"id3", sysUpdated: "2016-01-01T10:04", value: "3b"});

        obj1a.obj2 = [obj2a];
        obj3a.obj1 = [obj1a];

        var obj1b = appstax.object("coll1", {
            sysObjectId:"id1",
            sysUpdated: "2016-01-01T10:05",
            value: "1b",
            obj2: {
                sysDatatype: "relation",
                sysCollection: "coll2",
                sysRelationType: "array",
                sysObjects: ["id2"]
            }
        });

        obj3b.obj1 = [obj1b];

        var n = normalizer(appstax.objects);
        console.log("normalizing 1a");
        n.normalize(obj1a, 1);
        console.log("normalizing 3b");
        n.normalize(obj3b, 1);

        expect(obj1a.obj2[0]).equals(obj2a);
        expect(obj3b.obj1[0]).equals(obj1a);
        expect(obj3b.obj1[0].obj2[0]).equals(obj2a);
        expect(obj1a.value).equals("1b");
        expect(obj1b.value).equals("1b");
    });


});
