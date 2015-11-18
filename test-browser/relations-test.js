
var appstax = require("../src/appstax");
var sinon = require("sinon");
var Q = require("q");

describe("Object relations", function() {

    var xhr, requests;

    beforeEach(function() {
        appstax.init({baseUrl: "http://localhost:3000/", log:false});
        requests = [];
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function(request) {
            requests.push(request);
        };
        setupCollections();
    });

    afterEach(function() {
        xhr.restore();
    });

    function setupCollections() {
        appstax.collection("invoices", {amount:"number", customer:{type:"relation", relation:"single"} });
        appstax.collection("customers", {name:"string"});
        appstax.collection("blogs", {title:"string", posts:{type:"relation", relation:"array"}});
        appstax.collection("posts", {title:"string"})
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

    it("should have object ids as values for unexpanded properties", function() {
        var object = appstax.object("foo", {
            prop1: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysObjects: ["id1"]
            },
            prop2: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysObjects: ["id2", "id3"]
            },
            prop3: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysObjects: []
            },
            prop4: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysObjects: []
            }
        });

        expect(object.prop1).to.equal("id1");
        expect(object.prop2).to.have.length(2);
        expect(object.prop2).to.contain("id2");
        expect(object.prop2).to.contain("id3");
        expect(object.prop3).to.be.undefined
        expect(object.prop4).to.have.length(0);
    });

    it("should include related objects as expanded properties", function() {
        var object = appstax.object("collection1", {
            prop1: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysCollection: "collection2",
                sysObjects: [{
                    sysObjectId:"id1",
                    prop3: "value3"
                }]
            },
            prop2: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysCollection: "collection3",
                sysObjects: [{
                    sysObjectId:"id2",
                    prop4: "value4a"
                }, {
                    sysObjectId:"id3",
                    prop4: "value4b"
                }]
            }
        });

        expect(object.prop1.id).to.equal("id1");
        expect(object.prop1.collectionName).to.equal("collection2");
        expect(object.prop1.prop3).to.equal("value3");
        expect(object.prop2).to.have.length(2);
        expect(object.prop2[0].id).to.equal("id2")
        expect(object.prop2[0].collectionName).to.equal("collection3")
        expect(object.prop2[0].prop4).to.equal("value4a")
        expect(object.prop2[1].id).to.equal("id3")
        expect(object.prop2[1].collectionName).to.equal("collection3")
        expect(object.prop2[1].prop4).to.equal("value4b")
    });

    it("save() should fail when object has unsaved objects in relations", function() {
        var invoice  = appstax.object("invoices",  {amount: 149});
        var customer = appstax.object("customers", {name:"Bill Buyer"});

        invoice.customer = customer;

        expect(function() {
            invoice.save();
        }).to.throw("Error saving object.");
        expect(requests.length).to.equal(0);
    });

    it("save() should fail when object has unsaved objects in relations (without collection info)", function() {
        var invoice  = appstax.object("invoices2",  {amount: 149});
        var customer = appstax.object("customers2", {name:"Bill Buyer"});

        invoice.customer = customer;

        expect(function() {
            invoice.save();
        }).to.throw("Error saving object.");
        expect(requests.length).to.equal(0);
    });

    it("saveAll() should save newly created related single objects", function(done) {
        var invoice  = appstax.object("invoices",  {amount: 149});
        var customer = appstax.object("customers", {name:"Bill Buyer"});

        invoice.customer = customer;
        invoice.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"customer-id-1"}));

            setTimeout(function() {

                expect(requests.length).to.equal(2);
                expect(requests[0].method).to.equal("POST");
                expect(requests[0].url).to.equal("http://localhost:3000/objects/customers");
                expect(JSON.parse(requests[0].requestBody)).to.have.property("name", "Bill Buyer");

                expect(requests[1].method).to.equal("POST");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/invoices");
                var changes = JSON.parse(requests[1].requestBody).customer.sysRelationChanges;
                expect(changes.additions).to.have.length(1);
                expect(changes.additions).to.contain("customer-id-1");

                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should save newly created related single objects (without collection info)", function(done) {
        var invoice  = appstax.object("invoices2",  {amount: 149});
        var customer = appstax.object("customers2", {name:"Bill Buyer"});

        invoice.customer = customer;
        invoice.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"customer-id-1"}));

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[0].method).to.equal("POST");
                expect(requests[0].url).to.equal("http://localhost:3000/objects/customers2");
                expect(JSON.parse(requests[0].requestBody)).to.have.property("name", "Bill Buyer");

                expect(requests[1].method).to.equal("POST");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/invoices2");
                var changes = JSON.parse(requests[1].requestBody).customer.sysRelationChanges;
                expect(changes.additions).to.have.length(1);
                expect(changes.additions).to.contain("customer-id-1");

                done();
            }, 10);
        }, 10);
    });

    it("save() should handle setting relation with previously created single objects", function(done) {
        var invoice  = appstax.object("invoices",  {amount: 149});
        var customer = appstax.object("customers", {name:"Bill Buyer", sysObjectId:"customer-id-1001"});

        invoice.customer = customer;
        invoice.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("customer-id-1001");
            done();
        }, 10);
    });

    it("save() should handle setting relation with previously created single objects (without collection info)", function(done) {
        var invoice  = appstax.object("invoices2",  {amount: 149});
        var customer = appstax.object("customers2", {name:"Bill Buyer", sysObjectId:"customer-id-1001"});

        invoice.customer = customer;
        invoice.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices2");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("customer-id-1001");
            done();
        }, 10);
    });

    it("save() should handle removing single relation", function(done) {
        var invoice  = appstax.object("invoices",  {
            amount: 149,
            sysObjectId: "invoice-1",
            customer: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysObjects: ["customer-1"]
            }
        });

        invoice.customer = null;
        invoice.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("PUT");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices/invoice-1");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(0);
            expect(changes.removals).to.have.length(1);
            expect(changes.removals).to.contain("customer-1");
            done();
        }, 10);
    });

    it("save() should handle replacing single relation with other existing object", function(done) {
        var invoice  = appstax.object("invoices",  {
            amount: 149,
            sysObjectId: "invoice-1",
            customer: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysObjects: ["customer-1"]
            }
        });

        invoice.customer = appstax.object("customer", {sysObjectId:"customer-2"});
        invoice.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("PUT");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices/invoice-1");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("customer-2");
            expect(changes.removals).to.have.length(1);
            expect(changes.removals).to.contain("customer-1");
            done();
        }, 10);
    });

    it("save() should handle replacing single expanded relation with other existing object", function(done) {
        var invoice  = appstax.object("invoices",  {
            amount: 149,
            sysObjectId: "invoice-1",
            customer: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysObjects: [{
                    sysObjectId: "customer-1",
                    name: "Custer Customer"
                }]
            }
        });

        invoice.customer = appstax.object("customer", {sysObjectId:"customer-2"});
        invoice.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("PUT");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices/invoice-1");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("customer-2");
            expect(changes.removals).to.have.length(1);
            expect(changes.removals).to.contain("customer-1");
            done();
        }, 10);
    });

    it("save() should only send new relation changes for single relation", function(done) {
        var invoice  = appstax.object("invoices",  {
            amount: 149,
            sysObjectId: "invoice-1",
            customer: {
                sysDatatype: "relation",
                sysRelationType: "single",
                sysObjects: ["customer-1"]
            }
        });

        invoice.customer = appstax.object("customers", {sysObjectId:"customer-2"});
        var promise = invoice.save();

        setTimeout(function() {
            requests[0].respond(200, {}, "");
        }, 10);

        promise.then(function() {
            invoice.customer = appstax.object("customers", {sysObjectId:"customer-3"});
            invoice.save();

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].method).to.equal("PUT");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/invoices/invoice-1");
                var changes = JSON.parse(requests[1].requestBody).customer.sysRelationChanges;
                expect(changes.additions).to.have.length(1);
                expect(changes.additions).to.contain("customer-3");
                expect(changes.removals).to.have.length(1);
                expect(changes.removals).to.contain("customer-2");
                done();
            }, 10);
        }).done();
    });

    it("save() should only send new relation changes for single relation (starting with a multipart object/file save)", function(done) {
        var invoice  = appstax.object("invoices");
        invoice.amount = 149;
        invoice.attachment = appstax.file(mockFile("foo.txt"))
        invoice.customer = appstax.object("customers", {sysObjectId:"customer-1"});

        var promise1 = invoice.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].requestBody).to.be.instanceOf(FormData);
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"invoice-1"}));
        }, 10);

        promise1.then(function() {
            invoice.customer = appstax.object("customers", {sysObjectId:"customer-2"});
            invoice.save();

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                requests[1].respond(200, {}, "");

                setTimeout(function() {
                    invoice.customer = appstax.object("customers", {sysObjectId:"customer-3"});
                    invoice.save();

                    setTimeout(function() {
                        expect(requests.length).to.equal(3);
                        expect(requests[2].method).to.equal("PUT");
                        expect(requests[2].url).to.equal("http://localhost:3000/objects/invoices/invoice-1");
                        var changes = JSON.parse(requests[2].requestBody).customer.sysRelationChanges;
                        expect(changes.additions).to.have.length(1);
                        expect(changes.additions).to.contain("customer-3");
                        expect(changes.removals).to.have.length(1);
                        expect(changes.removals).to.contain("customer-2");

                        done();
                    }, 10);
                }, 10);
            }, 10);
        });
    });

    it("save() should fail when there are unsaved related array objects", function() {
        var blog  = appstax.object("blogs", {title: "Zen"});
        var post1 = appstax.object("posts", {title: "Post 1"});
        var post2 = appstax.object("posts", {title: "Post 2"});

        blog.posts.push(post1, post2);

        expect(function() {
            blog.save();
        }).to.throw("Error saving object.");
        expect(requests.length).to.equal(0);
    });

    it("save() should fail when there are unsaved related array objects (without collection info)", function() {
        var blog  = appstax.object("blogs2", {title: "Zen"});
        var post1 = appstax.object("posts2", {title: "Post 1"});
        var post2 = appstax.object("posts2", {title: "Post 2"});

        blog.posts = [post1, post2];

        expect(function() {
            blog.save();
        }).to.throw("Error saving object.");
        expect(requests.length).to.equal(0);
    });

    it("saveAll() should create and save newly created related array objects", function(done) {
        var blog  = appstax.object("blogs", {title: "Zen"});
        var post1 = appstax.object("posts", {title: "Post 1"});
        var post2 = appstax.object("posts", {title: "Post 2"});

        blog.posts.push(post1, post2)
        blog.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(2);
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"post-id-1"}));
            requests[1].respond(200, {}, JSON.stringify({sysObjectId:"post-id-2"}));

            setTimeout(function() {
                expect(requests.length).to.equal(3);
                expect(requests[0].method).to.equal("POST");
                expect(requests[0].url).to.equal("http://localhost:3000/objects/posts");
                expect(JSON.parse(requests[0].requestBody)).to.have.property("title", "Post 1");
                expect(requests[1].method).to.equal("POST");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/posts");
                expect(JSON.parse(requests[1].requestBody)).to.have.property("title", "Post 2");

                expect(requests[2].method).to.equal("POST");
                expect(requests[2].url).to.equal("http://localhost:3000/objects/blogs");
                var changes = JSON.parse(requests[2].requestBody).posts.sysRelationChanges;
                expect(changes.additions).to.have.length(2);
                expect(changes.additions).to.contain("post-id-1");
                expect(changes.additions).to.contain("post-id-2");
                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should create and save newly created related array objects (without collection info)", function(done) {
        var blog  = appstax.object("blogs2", {title: "Zen"});
        var post1 = appstax.object("posts2", {title: "Post 1"});
        var post2 = appstax.object("posts2", {title: "Post 2"});

        blog.posts = [post1, post2];
        blog.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(2);
            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"post-id-1"}));
            requests[1].respond(200, {}, JSON.stringify({sysObjectId:"post-id-2"}));

            setTimeout(function() {
                expect(requests.length).to.equal(3);
                expect(requests[0].method).to.equal("POST");
                expect(requests[0].url).to.equal("http://localhost:3000/objects/posts2");
                expect(JSON.parse(requests[0].requestBody)).to.have.property("title", "Post 1");
                expect(requests[1].method).to.equal("POST");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/posts2");
                expect(JSON.parse(requests[1].requestBody)).to.have.property("title", "Post 2");

                expect(requests[2].method).to.equal("POST");
                expect(requests[2].url).to.equal("http://localhost:3000/objects/blogs2");
                var changes = JSON.parse(requests[2].requestBody).posts.sysRelationChanges;
                expect(changes.additions).to.have.length(2);
                expect(changes.additions).to.contain("post-id-1");
                expect(changes.additions).to.contain("post-id-2");
                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should handle adding more objects to array relations", function(done) {
        var blog  = appstax.object("blogs", {
            title: "Zen",
            sysObjectId:"1234",
            posts:{sysDatatype:"relation", sysRelationType:"array"}
        });

        var post1 = appstax.object("posts", {title: "Post 1"});
        var post2 = appstax.object("posts", {title: "Post 2"});

        blog.posts.push(post1, post2)
        blog.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(2);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/posts");
            expect(JSON.parse(requests[0].requestBody)).to.have.property("title", "Post 1");
            expect(requests[1].method).to.equal("POST");
            expect(requests[1].url).to.equal("http://localhost:3000/objects/posts");
            expect(JSON.parse(requests[1].requestBody)).to.have.property("title", "Post 2");

            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"post-id-1"}));
            requests[1].respond(200, {}, JSON.stringify({sysObjectId:"post-id-2"}));

            setTimeout(function() {
                expect(requests.length).to.equal(3);

                expect(requests[2].method).to.equal("PUT");
                expect(requests[2].url).to.equal("http://localhost:3000/objects/blogs/1234");
                var changes = JSON.parse(requests[2].requestBody).posts.sysRelationChanges;
                expect(changes.additions).to.have.length(2);
                expect(changes.additions).to.contain("post-id-1");
                expect(changes.additions).to.contain("post-id-2");
                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should handle multiple relations", function(done) {
        var blog  = appstax.object("blogs", {
            title: "Zen",
            sysObjectId:"1234",
            posts: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysObjects: ["post-1", "post-2"]
            }
        });

        blog.author = appstax.object("users", {sysObjectId: "the-user-id"});
        blog.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("PUT");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/blogs/1234");
            var changes = JSON.parse(requests[0].requestBody).author.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("the-user-id");
            expect(changes.removals).to.have.length(0);
            done();
        }, 10);
    });

    it("save() should handle adding and removing objects in array relation", function(done) {
        var blog  = appstax.object("blogs",  {
            sysObjectId: "blog-1",
            posts: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysObjects: ["post-1", {sysObjectId: "post-2"}]
            }
        });

        blog.posts.splice(0, 1);
        blog.posts.push(appstax.object("posts", {sysObjectId:"post-3"}));
        blog.save();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("PUT");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/blogs/blog-1");
            var changes = JSON.parse(requests[0].requestBody).posts.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("post-3");
            expect(changes.removals).to.have.length(1);
            expect(changes.removals).to.contain("post-1");
            done();
        }, 10);
    });

    it("save() should only send new array relation changes for each save", function(done) {
        var blog  = appstax.object("blogs",  {
            sysObjectId: "blog-1",
            posts: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysObjects: ["post-1", "post-2"]
            }
        });

        blog.posts.splice(0, 1); // remove post-1
        blog.posts.push(appstax.object("posts", {sysObjectId:"post-3"}));
        blog.save();

        setTimeout(function() {
            requests[0].respond(200, {}, "");

            setTimeout(function() {
                blog.posts.splice(1, 1); // remove post-3
                blog.posts.push(appstax.object("posts", {sysObjectId:"post-4"}));
                blog.save();

                setTimeout(function() {
                    expect(requests.length).to.equal(2);
                    expect(requests[1].method).to.equal("PUT");
                    expect(requests[1].url).to.equal("http://localhost:3000/objects/blogs/blog-1");
                    var changes = JSON.parse(requests[1].requestBody).posts.sysRelationChanges;
                    expect(changes.additions).to.have.length(1);
                    expect(changes.additions).to.contain("post-4");
                    expect(changes.removals).to.have.length(1);
                    expect(changes.removals).to.contain("post-3");
                    done();
                }, 10);
            }, 10);
        }, 10);
    });

    it("saveAll() should handle circular references for single relations in new objects", function(done) {
        var object1 = appstax.object("collection1");
        var object2 = appstax.object("collection2");
        object1.property1 = object2;
        object2.property2 = object1;

        object1.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(2);

            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/collection2");
            var changes1 = JSON.parse(requests[0].requestBody).property2.sysRelationChanges;
            expect(changes1.additions).to.have.length(0);
            expect(changes1.removals).to.have.length(0);

            expect(requests[1].method).to.equal("POST");
            expect(requests[1].url).to.equal("http://localhost:3000/objects/collection1");
            var changes0 = JSON.parse(requests[1].requestBody).property1.sysRelationChanges;
            expect(changes0.additions).to.have.length(0);
            expect(changes0.removals).to.have.length(0);

            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id2"}));
            requests[1].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));

            setTimeout(function() {
                expect(requests.length).to.equal(4);

                expect(requests[2].method).to.equal("PUT");
                expect(requests[2].url).to.equal("http://localhost:3000/objects/collection1/id1");
                var changes2 = JSON.parse(requests[2].requestBody).property1.sysRelationChanges;
                expect(changes2.additions).to.have.length(1);
                expect(changes2.additions).to.contain("id2");
                expect(changes2.removals).to.have.length(0);

                expect(requests[3].method).to.equal("PUT");
                expect(requests[3].url).to.equal("http://localhost:3000/objects/collection2/id2");
                var changes3 = JSON.parse(requests[3].requestBody).property2.sysRelationChanges;
                expect(changes3.additions).to.have.length(1);
                expect(changes3.additions).to.contain("id1");
                expect(changes3.removals).to.have.length(0);

                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should also save objects without relation changes", function(done) {
        var invoice  = appstax.object("invoices",  {amount: 149});
        var customer = appstax.object("customers", {name:"Bill Buyer", sysObjectId:"customer-id-1001"});

        invoice.customer = customer;
        invoice.customer.name = "Bill N. Buyer";
        invoice.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("customer-id-1001");

            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].method).to.equal("PUT");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/customers/customer-id-1001");
                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should also save objects without relation changes (without collection info)", function(done) {
        var invoice  = appstax.object("invoices2",  {amount: 149});
        var customer = appstax.object("customers2", {name:"Bill Buyer", sysObjectId:"customer-id-1001"});

        invoice.customer = customer;
        invoice.customer.name = "Bill N. Buyer";
        invoice.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(1);

            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/invoices2");
            var changes = JSON.parse(requests[0].requestBody).customer.sysRelationChanges;
            expect(changes.additions).to.have.length(1);
            expect(changes.additions).to.contain("customer-id-1001");

            requests[0].respond(200, {}, JSON.stringify({sysObjectId:"id1"}));

            setTimeout(function() {
                expect(requests.length).to.equal(2);
                expect(requests[1].method).to.equal("PUT");
                expect(requests[1].url).to.equal("http://localhost:3000/objects/customers2/customer-id-1001");
                done();
            }, 10);
        }, 10);
    });

    it("saveAll() should also save objects without relations", function(done) {
        var foo = appstax.object("foo");
        foo.bar = "baz";
        foo.saveAll();

        setTimeout(function() {
            expect(requests.length).to.equal(1);
            expect(requests[0].method).to.equal("POST");
            expect(requests[0].url).to.equal("http://localhost:3000/objects/foo");
            done();
        }, 10);
    });

    it("should send expand parameter in queries", function(done) {
        appstax.findAll("invoices");
        appstax.findAll("invoices", {expand:true});
        appstax.findAll("invoices", {expand:2});
        appstax.find("invoices", "1234", {expand:true});
        appstax.find("invoices", function(query) {}, {expand:2});
        appstax.find("invoices", {amount:1001}, {expand:3});
        appstax.search("invoices", {description:"discount"}, {expand:4});
        appstax.search("invoices", "discount", ["description", "other"], {expand:5});

        setTimeout(function() {
            expect(requests.length).to.equal(8);
            expect(requests[0].url).to.not.contain("expanddepth=");
            expect(requests[1].url).to.contain("?expanddepth=1");
            expect(requests[2].url).to.contain("?expanddepth=2");
            expect(requests[3].url).to.contain("?expanddepth=1");
            expect(requests[4].url).to.contain("&expanddepth=2");
            expect(requests[5].url).to.contain("&expanddepth=3");
            expect(requests[6].url).to.contain("&expanddepth=4");
            expect(requests[7].url).to.contain("&expanddepth=5");
            done();
        }, 10);
    });

    it("should send object query with expansion depth when calling .expand()", function(done) {
        var object = appstax.object("blogs", {sysObjectId: "1234"});

        object.expand();
        object.expand(2);

        setTimeout(function() {
            expect(requests.length).to.equal(2);
            expect(requests[0].url).to.equal("http://localhost:3000/objects/blogs/1234?expanddepth=1");
            expect(requests[1].url).to.equal("http://localhost:3000/objects/blogs/1234?expanddepth=2");
            done();
        }, 10);
    });

    it("should reload object with expanded properties when calling .expand()", function(done) {
        var object = appstax.object("blogs", {
            sysObjectId: "1234",
            posts: {
                sysDatatype: "relation",
                sysRelationType: "array",
                sysObjects: ["id1", "id2"]
            },
            owner: {
                sysDatatype: "relation",
                sysRelationType: "sinlge",
                sysObjects: ["id3"]
            }
        });

        var promise = object.expand();

        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal("http://localhost:3000/objects/blogs/1234?expanddepth=1");

        setTimeout(function() {
            requests[0].respond(200, {}, JSON.stringify({
                sysObjectId: "1234",
                posts: {
                    sysDatatype: "relation",
                    sysRelationType: "array",
                    sysCollection: "posts",
                    sysObjects: [{title:"Zen"}, {title:"Flow"}]
                },
                owner: {
                    sysDatatype: "relation",
                    sysRelationType: "single",
                    sysCollection: "users",
                    sysObjects: [{name:"Mr. Blogger"}]
                }
            }));
        }, 10);

        promise.then(function(foo) {
            expect(object.owner.name).to.equal("Mr. Blogger");
            expect(object.posts[0].title).to.equal("Zen");
            expect(object.posts[1].title).to.equal("Flow");
            done();
        });
    });

    it("should fail when calling expand() on unsaved object", function() {
        var object = appstax.object("blogs");
        expect(function() {
            object.expand();
        }).to.throw("Error calling expand() on unsaved object");
    });

    it("should include related objects in queries", function(done) {
        var myTimeline = appstax.object("timelines", {sysObjectId:"12345"});

        appstax.find("events", function(query) {
            query.relation("timeline").has(myTimeline);
        });

        setTimeout(function() {
            expect(requests).to.have.length(1);
            expect(requests[0].url).to.equal("http://localhost:3000/objects/events?filter=timeline%20has%20(%2712345%27)");
            done();
        }, 10);
    });

    it("should include related objects in property match queries", function(done) {
        var myTimeline = appstax.object("timelines", {sysObjectId:"12345"});

        appstax.find("events", {timeline:myTimeline});

        setTimeout(function() {
            expect(requests).to.have.length(1);
            expect(requests[0].url).to.equal("http://localhost:3000/objects/events?filter=timeline%20has%20(%2712345%27)");
            done();
        }, 10);
    });

});
