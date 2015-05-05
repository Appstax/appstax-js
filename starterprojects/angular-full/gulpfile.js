
var gulp = require('gulp');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var connect = require('gulp-connect');
var watch = require('gulp-watch');
var sass = require('gulp-sass');

// Delete the public directory
gulp.task('clean', function() {
 return gulp.src('public')
 .pipe(clean());
});

//Concat and copy all local JavaScript to the public dir
gulp.task('js', function(){
	gulp.src(['app/module.js', 'app/modules/**/*.js'])
		.pipe(concat('app.js'))
		.pipe(gulp.dest('public/scripts'));
});

//Concat and copy all other JavaScript to the public dir
gulp.task('js-vendor', function(){
	gulp.src([
			'bower_components/jquery/dist/jquery.js',
			'bower_components/angular/angular.js',
			'bower_components/bootstrap/dist/js/bootstrap.js',
			'bower_components/angular-sanitize/angular-sanitize.js',
			'bower_components/angular-ui-router/release/angular-ui-router.js',	
			'bower_components/gdsmith-jquery-easing/jquery.easing.1.3.min.js',
			'bower_components/appstax/appstax.js'
			])
		.pipe(concat('vendor.js'))
		.pipe(gulp.dest('public/scripts'));
});

gulp.task('html', function(){
	gulp.src(['app/index.html', 'app/modules/**/*html'],{base: './app'})
		.pipe(gulp.dest('public'));
});

gulp.task('css', function(){
	gulp.src(['app/styles/**/*.css'])
		.pipe(gulp.dest('public/styles'));
});

//Compile and copy Sass files
gulp.task('sass', function() {
	gulp.src('app/styles/**/*.scss')
		.pipe(sass())
		.pipe(gulp.dest('public/styles'));
});

//Copy all images
gulp.task('img', function(){
	gulp.src(['app/images/**/*'])
		.pipe(gulp.dest('public/images'));
});

gulp.task('assets', function(){
	gulp.src('app/bower_components/bootstrap/dist/fonts/**/*', {base: './app/bower_components'})
		.pipe(gulp.dest('public/styles'));
});

//Starts the web server and watch for changes
gulp.task('server', function() {
  connect.server({
  	port:9000,
  	
  	livereload: true,
  	root: ['public']
  });
});

//Watch relevant files and rerun tasks accordingly
gulp.task('watch', function() {
    gulp.watch('app/modules/**/*.js', ['js']);
    gulp.watch('app/styles/**/*.scss', ['sass']);
    gulp.watch('app/modules/**/*.html', ['html']);
});

gulp.task('livereload', function() {
  gulp.src(['public/styles/*.css', 'public/scripts/*.js', 'public/modules/**/*.html'])
    .pipe(watch())
    .pipe(connect.reload());
});


// Default Task
gulp.task('default', ['js', 'js-vendor', 'html',  'sass', 'css', 'img', 'assets']);

gulp.task('serve', ['default','server', 'livereload', 'watch']);
