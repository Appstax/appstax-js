var gulp = require('gulp');
var clean = require('gulp-clean');
var connect = require('gulp-connect');
var concat = require('gulp-concat');
var watch = require('gulp-watch');

gulp.task('default', ['deploy']);
gulp.task('deploy', ['js', 'js-vendor', 'html', 'styles', 'images']);
gulp.task('serve', ['deploy','server','watch','livereload']);

gulp.task('clean', function() {
    return gulp.src('dist')
               .pipe(clean());
});

gulp.task('js', function(){
    gulp.src(['app/module.js', 'app/modules/**/*.js'])
        .pipe(concat('app.js'))
        .pipe(gulp.dest('dist/scripts'));
});

gulp.task('js-vendor', function(){
    gulp.src([
            'app/vendor/**/*.js',
            'bower_components/jquery/dist/jquery.js',
            'bower_components/angular/angular.js',
            'bower_components/angular-ui-router/release/angular-ui-router.js',
            'bower_components/angular-bootstrap/ui-bootstrap.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
            'themes/grayscale/js/jquery.easing.min.js',
            'themes/grayscale/js/grayscale.js',
            'bower_components/spin.js/spin.js',
            'bower_components/ladda/dist/ladda.min.js',
            'bower_components/angular-ladda/dist/angular-ladda.min.js'
            ])
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('dist/scripts'));
});

gulp.task('html', function(){
    gulp.src(['app/*.html', 'app/modules/**/*.html'],{base: './app'})
        .pipe(gulp.dest('dist'));
});

gulp.task('images', function(){
    gulp.src(['app/images/**/*.*'],{base: './app/images'})
        .pipe(gulp.dest('dist/images'));
});

gulp.task('styles', function(){
    gulp.src(['bower_components/**/*.css', 
              'app/styles/**/*.css',
              'themes/grayscale/css/*.css',
              'themes/grayscale/font-awesome-4.1.0/css/*.css',
              'themes/grayscale/font-awesome-4.1.0/fonts/*.*',
              'themes/grayscale/img/*.*'],{base: '.'})
        .pipe(gulp.dest('dist/styles'));
});

gulp.task('server', function() {
    connect.server({
        port:9000,
        root: ['.', 'dist']
    });
});

gulp.task('watch', function() {
    gulp.watch('app/**/*.js', ['js']);
    gulp.watch('app/**/*.css', ['styles']);
    gulp.watch('app/**/*.html', ['html']);
});

gulp.task('livereload', function() {
  gulp.src(['dist/styles/*.css', 'dist/scripts/*.js', 'dist/**/*.html'])
    .pipe(watch())
    .pipe(connect.reload());
});
