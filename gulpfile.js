
var gulp = require("gulp");
var jscs = require('gulp-jscs');
var webserver = require('gulp-webserver');
var browserify = require("gulp-browserify");
var url = require('url');
var proxy = require('proxy-middleware');
var zip = require("gulp-zip");
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var karma = require('karma').server;
var replace = require('gulp-replace');
var mocha = require('gulp-mocha');

gulp.task("default", ["clean","bundle-uglify"]);
gulp.task("sdk", ["bundle", "sdk-zip"]);

gulp.task('clean', function() {
    return gulp.src('build')
               .pipe(clean());
});

gulp.task("test", ["test-watch", "test-run"]);
gulp.task("test-run", ["test-run-node", "test-run-browser"]);
gulp.task("test-ci", ["test-run-browser-ci", "test-run-node"]);

gulp.task("test-run-node", function() {
    return gulp.src('test-node/*.js', {read: false})
            .pipe(mocha({reporter:"progress", bail:false}));
});

gulp.task("test-run-browser", function(done) {
    console.log("\n* Running browser tests");
    karma.start({
        configFile: __dirname + '/karma.conf.js'
    }, done);
});

gulp.task("test-run-browser-ci", ["test-build"], function(done) {
    console.log("\n* Running browser tests");
    karma.start({
        configFile: __dirname + '/karma.ci.conf.js'
    }, done);
});

gulp.task("test-build", ["jscs"], function(done) {
    gulp.src("test-browser/index.js")
        .pipe(browserify({exclude: "./http-node"}))
        .pipe(rename("appstax-test.js"))
        .pipe(gulp.dest("./build/"))
        .on("end", done);
});

gulp.task("test-watch", ["test-build"], function () {
    gulp.watch("build/appstax-test.js", ["test-run"]);
    gulp.watch("src/**/*.js", ["test-build"]);
    gulp.watch("test-browser/**/*.js", ["test-build"]);
    gulp.watch("test-node/**/*.js", ["test-build"]);
});

gulp.task("jscs", function() {
    return gulp.src(["src/**/*.js", "test-*/**/*.js"])
               .pipe(jscs());
})

gulp.task("bundle", ["jscs"], function() {
    return gulp.src("src/appstax.js")
               .pipe(browserify({
                   standalone: "appstax",
                   exclude: "./http-node"
               }))
               .pipe(replace(" "," ")) // replace non-breaking space with space
               .pipe(gulp.dest("./build/"));
});

gulp.task("bundle-uglify", ["bundle"], function() {
    return gulp.src("build/appstax.js")
               .pipe(uglify())
               .pipe(rename("appstax.min.js"))
               .pipe(gulp.dest("./build/"));
})

gulp.task("sdk-assemble-bundle", ["bundle", "bundle-uglify"], function() {
    return gulp.src(["build/appstax.js","build/appstax.min.js"])
               .pipe(gulp.dest("build/appstax-js"))
               .pipe(gulp.dest("build/appstax-js/examples/notes/app/vendor"))
               .pipe(gulp.dest("build/appstax-js/starterprojects/angular/app/vendor"))
               .pipe(gulp.dest("build/appstax-js/starterprojects/basic/"));
});

gulp.task("sdk-assemble-examples", ["bundle"], function() {
    return gulp.src(["examples/**/*",
                     "!examples/notes/{bower_components,bower_components/**}",
                     "!examples/notes/{node_modules,node_modules/**}",
                     "!examples/notes/{dist,dist/**}",
                     "!examples/mybox/{bower_components,bower_components/**}",
                     "!examples/mybox/{node_modules,node_modules/**}",
                     "!examples/mybox/{dist,dist/**}"])
               .pipe(gulp.dest("build/appstax-js/examples"));
});

gulp.task("sdk-assemble-starterprojects", ["bundle"], function() {
    return gulp.src(["starterprojects/**/*",
                     "!starterprojects/{angular,angular-full}/{public,public/**,bower_components,bower_components/**,node_modules,node_modules/**}"])
               .pipe(gulp.dest("build/appstax-js/starterprojects"));
});

gulp.task("sdk-zip", ["sdk-assemble-examples", "sdk-assemble-starterprojects", "sdk-assemble-bundle"], function() {
    return gulp.src("build/appstax-js/**/*", {base: "build"})
               .pipe(zip("appstax-js.zip"))
               .pipe(gulp.dest("build"));
});


