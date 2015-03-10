
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

gulp.task("default", ["clean","bundle-uglify"]);
gulp.task("sdk", ["bundle", "sdk-zip"]);

gulp.task('clean', function() {
    return gulp.src('build')
               .pipe(clean());
});

gulp.task("test", ["test-build", "test-watch", "test-run"]);

gulp.task("test-run", function(done) {
    return karma.start({
        configFile: __dirname + '/karma.conf.js'
    }, done);
});

gulp.task("test-ci", ["test-build"], function (done) {
    return karma.start({
        configFile: __dirname + '/karma.ci.conf.js'
    }, done);
});

gulp.task("test-build", ["jscs"], function(done) {
    gulp.src("test/index.js")
        .pipe(browserify())
        .pipe(rename("appstax-test.js"))
        .pipe(gulp.dest("./build/"))
        .on("end", done);
});

gulp.task("test-watch", function (done) {
    gulp.watch("build/appstax-test.js", ["test-run"]);
    gulp.watch("src/**/*.js", ["test-build"]);
    gulp.watch("test/**/*.js", ["test-build"]);
});

gulp.task("jscs", function() {
    return gulp.src(["src/**/*.js", "test/**/*.js"])
               .pipe(jscs());
})

gulp.task("bundle", ["jscs"], function() {
    return gulp.src("src/appstax.js")
               .pipe(browserify({
                   standalone: "appstax"
               }))
               .pipe(gulp.dest("./build/"));
});

gulp.task("bundle-uglify", ["bundle"], function() {
    return gulp.src("build/appstax.js")
               .pipe(uglify())
               .pipe(rename("appstax.min.js"))
               .pipe(gulp.dest("./build/"));
})

gulp.task("sdk-assemble-bundle", ["bundle"], function() {
    return gulp.src(["build/appstax.js","build/appstax.min.js"])
               .pipe(gulp.dest("build/appstax-js-sdk"))
               .pipe(gulp.dest("build/appstax-js-sdk/examples/notes/app/vendor"))
               .pipe(gulp.dest("build/appstax-js-sdk/starterprojects/angular/app/vendor"))
               .pipe(gulp.dest("build/appstax-js-sdk/starterprojects/basic/"));
});

gulp.task("sdk-assemble-examples", ["bundle"], function() {
    return gulp.src(["examples/**/*",
                     "!examples/notes/{bower_components,bower_components/**}",
                     "!examples/notes/{node_modules,node_modules/**}",
                     "!examples/notes/{dist,dist/**}",
                     "!examples/mybox/{bower_components,bower_components/**}",
                     "!examples/mybox/{node_modules,node_modules/**}",
                     "!examples/mybox/{dist,dist/**}"])
               .pipe(gulp.dest("build/appstax-js-sdk/examples"));
});

gulp.task("sdk-assemble-starterprojects", ["bundle"], function() {
    return gulp.src(["starterprojects/**/*",
                     "!starterprojects/angular/{bower_components,bower_components/**}",
                     "!starterprojects/angular/{node_modules,node_modules/**}"])
               .pipe(gulp.dest("build/appstax-js-sdk/starterprojects"));
});

gulp.task("sdk-zip", ["sdk-assemble-examples", "sdk-assemble-starterprojects", "sdk-assemble-bundle"], function() {
    return gulp.src("build/appstax-js-sdk/**/*")
               .pipe(zip("appstax-js-sdk.zip"))
               .pipe(gulp.dest("build"));
});


