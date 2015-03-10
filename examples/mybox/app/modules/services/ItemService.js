
app.service("ItemService", function($q, $state, $rootScope, $interval, UserService) {

    var service = this;
    this.allItems = [];

    /*
    $interval(function() {
        appstax.findAll("items").then(function(objects) {
            if(objects.length > service.allItems.length) {
                service.allItems = objects;
                $rootScope.$broadcast("items:change");
            }
        });
    }, 5000);*/

    this.getAllItems = function() {
        var promise = $q.when(appstax.findAll("items"));
        var service = this;
        return promise.then(function(objects) {
            service.allItems = objects;
            return objects;
        });
    }

    this.saveItems = function(items, progressCallback) {
        var doneCount = 0;
        var promises = [];
        items.forEach(function(item) {
            item.username = UserService.username();
            var promise = item.save();
            promises.push(promise);
            promise.then(function() { 
                $rootScope.$broadcast("items:change");
                doneCount++; 
                if(progressCallback) {
                    progressCallback(doneCount, items.length);    
                }
            });
        });
        return $q.all(promises);
    }

    this.createItem = function(file) {
        var item = appstax.object("items");
        item.description = "";
        item.username = "";
        item.tags = [];
        item.file = appstax.file(file);
        this.allItems.push(item);
        return item;
    }

    this.createItems = function(files) {
        var items = [];
        for(var i = 0; i < files.length; i++) {
            items.push(this.createItem(files[i]));
        }
        $rootScope.$broadcast("items:change");
        return items;
    }

});
