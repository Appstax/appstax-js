
appstax.init("NjE0M2Y0ODUtYTY5ZC00YmQwLTZlMTQtMWFjNTFmNzYxN2Rl");

var app = angular.module("AppstaxNotes", ["ui.bootstrap","monospaced.elastic","angular-ladda"]);

app.run(function($rootScope) {
    $rootScope.loggedIn = appstax.currentUser() != null;
});

app.controller("LoginCtl", function($scope, $rootScope, $timeout) {
    $scope.mode = "signup";
    $scope.submitLabel = {signup:"Sign up!", login:"Log in!"};
    $scope.username = "";
    $scope.password = "";
    $scope.error = "";
    $scope.activity = false;

    $scope.setMode = function(mode) {
        $scope.mode = mode;
        $scope.error = "";
    }

    $scope.submit = function() {
        $scope.activity = true;
        
        var promise;
        if($scope.mode == "signup") {
            promise = appstax.signup($scope.username, $scope.password, true)
        } else {
            promise = appstax.login($scope.username, $scope.password)
        }
        
        promise.then(function(user) {
                   $timeout(function() {
                       $rootScope.loggedIn = true;
                       $scope.activity = false;
                       $scope.username = "";
                       $scope.password = "";
                   }, 200);
               })
               .fail(function(error) {
                    $scope.$apply(function() {
                       $scope.error = error.message;
                       $scope.activity = false;
                   });
               });
    }
});

app.controller("LogoutCtl", function($scope, $rootScope) {
    $scope.username = "";
    $rootScope.$watch("loggedIn", function(loggedIn) {
        $scope.username = loggedIn ? appstax.currentUser().username : "";
    });
    $scope.logout = function() {
        $rootScope.loggedIn = false;
        appstax.logout();
    }
});

app.controller("NotesCtl", function($scope, $rootScope, $modal, $timeout) {
    initScope();    

    $rootScope.$watch("loggedIn", function(loggedIn) {
        if(loggedIn) {
            appstax.findAll("Notes").then(showObjects);
        } else {
            initScope();
        }
    });

    function initScope() {
        $scope.loading = true;
        $scope.notes = [];
        $scope.open = [];
        $scope.editing = [];
        $scope.empty = false;
        $scope.saveActivity = [];
    }
    
    function showObjects(objects) {
        $scope.$apply(function() {
            $scope.loading = false;
            $scope.notes = objects.slice().reverse();
            $scope.notes.forEach(function(note) {
                note.ColorIndex = note.ColorIndex || 0;
            });
            $scope.empty = $scope.notes.length == 0;
        });
    }

    $scope.share = function(note) {
        var modalInstance = $modal.open({
            templateUrl: 'share.html',
            controller: 'ShareModalCtl',
            resolve: {
                note: function() { return note; }
            }
        });
    }

    $scope.unshare = function(note, username) {
        var index = note.SharedWith.indexOf(username);
        if(index >= 0 && username !== appstax.currentUser().username) {
            note.revoke(username, ["read","update"]);
            note.save()
                .then(function() {
                    $scope.$apply(function() {
                        note.SharedWith.splice(index, 1);
                        if(note.SharedWith.length === 1 &&
                           note.SharedWith[0] == appstax.currentUser().username) {
                            note.SharedWith = [];
                        }
                        note.save();
                    })
                });
        }
    }

    $scope.titleInputClicked = function($event) {
        $event.stopPropagation();
        $event.preventDefault();
    }

    $scope.edit = function(note, index) {
        note.refresh().then(function() {
            $scope.$apply(function() {
                $scope.editing[index] = true;
            });
        });
    }

    $scope.selectColor = function(note, colorIndex) {
        note.ColorIndex = colorIndex;
    }

    $scope.cancelEdit = function(note, index) {
        $scope.editing[index] = false;
    }

    $scope.save = function(note, index) {
        $scope.saveActivity[index] = true;
        note.save().then(function() {
            $timeout(function() {
                $scope.saveActivity[index] = false;
            }, 200);
            $timeout(function() {
                $scope.editing[index] = false;
            }, 500);
        });
    }

    $scope.add = function() {
        var note = appstax.object("Notes", {ColorIndex:0});
        $scope.notes.unshift(note);
        $scope.open.unshift(true);
        $scope.editing.unshift(true);
        $timeout(function() {
            $scope.edit(note, 0);
        }, 100);
    }
});

app.controller("ShareModalCtl", function($scope, $modalInstance, $timeout, note) {
    $scope.username = "";
    $scope.note = note;
    $scope.error = "";
    $scope.activity = false;
    $scope.ok = function() {
        $scope.activity = true;
        note.grant($scope.username, ["read","update"]);
        note.save()
            .then(function() {
                addSharedWith($scope.username);
                return note.save().then(function() {
                    $timeout(function() {
                        $scope.activity = false;
                        $modalInstance.close();
                    }, 200);
                });
            })
            .fail(function(error) {
                $scope.$apply(function() {
                    $scope.activity = false;
                    $scope.error = error.message;    
                });
            });
    }
    $scope.cancel = function() {
        $modalInstance.dismiss("cancel");
    }

    function addSharedWith(username) {
        if(!note.SharedWith) {
            note.SharedWith = [];
        }
        if(note.SharedWith.indexOf(appstax.currentUser().username) == -1) {
            note.SharedWith.push(appstax.currentUser().username);    
        }
        if(note.SharedWith.indexOf(username) == -1) {
            note.SharedWith.push($scope.username);    
        }
    }
});



