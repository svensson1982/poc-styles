"use strict";

const gulp = require("gulp");
const rename = require("gulp-rename");
const sass = require("gulp-sass")(require("sass"));
const fs = require("fs");
const cssToTwPlugin = require("./scripts/cssToTwPlugin.js");

function cleanUp(cb) {
  fs.rmSync('./dist/', { recursive: true, force: true });
  cb();
}

function buildStyles() {
  return gulp
    .src("./components/**/*.scss")
    .pipe(sass.sync().on("error", sass.logError))
    .pipe(gulp.dest("./dist"));
}

function buildMinStyles() {
  return gulp
    .src("./components/**/*.scss")
    .pipe(sass.sync({ outputStyle: 'compressed' }).on("error", sass.logError))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest("./dist"));
}

async function buildTailwindPlugins() {
  const prettier = (await import('gulp-prettier')).default;
  return gulp
    .src("./dist/**/*.min.css")
    .pipe(cssToTwPlugin())
    .pipe(prettier({
      printWidth: 140,
      singleQuote: true
    }))
    .pipe(gulp.dest("./dist"));
}

function watch() {
  gulp.watch("./components/**/*.scss", gulp.series(cleanUp, buildStyles, buildMinStyles, buildTailwindPlugins));
}

exports.cleanUp = cleanUp;
exports.buildStyles = buildStyles;
exports.buildMinStyles = buildMinStyles;
exports.watch = watch;
exports.default = gulp.series(cleanUp, buildStyles, buildMinStyles, buildTailwindPlugins);
