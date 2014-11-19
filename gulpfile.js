'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var concat = require('gulp-concat');

gulp.task('default', ['js', 'css']);

gulp.task('js', function () {
  return gulp.src('fb.js')
    .pipe(uglify())
    .pipe(concat('fb.min.js'))
    .pipe(gulp.dest('build'));
});

gulp.task('css', function () {
  return gulp.src(['fb-login.css', 'sc-btn.css'])
    .pipe(minifyCss({ keepBreaks: true }))
    .pipe(concat('fb-login.min.css'))
    .pipe(gulp.dest('build'));
});