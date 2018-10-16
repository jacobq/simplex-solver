const gulp = require('gulp');
const eslint = require('gulp-eslint');
const ts = require('gulp-typescript');
const tslint = require('gulp-tslint');
const mocha = require('gulp-mocha');

const merge = require('merge2');
const fs = require('fs-extra');

// We create two projects to work around:
//   Error: gulp-typescript: A project cannot be used in two compilations at the same time.
//   Create multiple projects with createProject instead
const tsProjectSrcDef = ts.createProject('tsconfig.json', { declaration: true, allowJs: false });
const tsProjectSrc = ts.createProject('tsconfig.json');
const tsProjectTest = ts.createProject('tsconfig.json');

gulp.task('default', ['test'], () => {});

gulp.task('lint', ['tslint', 'eslint'], () => {});

gulp.task('tslint', () =>
    gulp.src('src/**/*.ts')
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report())
);

gulp.task('eslint', () => {
    return gulp.src(['src/**/*.js', '!node_modules/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});


gulp.task('clean', [], () => {
    fs.emptyDirSync('dist');
});


gulp.task('compile', ['clean', 'compileSrc', 'compileTest'], () => {});

gulp.task('compileSrc', () => {
    const tsSrcDef = gulp.src('src/**/*.ts').pipe(tsProjectSrcDef());
    const tsSrc = gulp.src('src/**/*.ts').pipe(tsProjectSrc());

    return merge([
        tsSrcDef.dts.pipe(gulp.dest('dist/def')),
        tsSrc.js.pipe(gulp.dest('dist/out'))
    ]);
});

gulp.task('compileTest', () => {
    const tsTest = gulp.src('test/**/*.ts').pipe(tsProjectTest());
    const testResources = gulp.src(['test/resources/**/*.*']);

    return merge([
        tsTest.js.pipe(gulp.dest('dist/test/out')),
        testResources.pipe(gulp.dest('dist/test/out/resources'))
    ]);
});

gulp.task('test', ['compile'], function() {
    return gulp.src(['dist/test/out'], { read: false })
        .pipe(mocha({
            require: 'test/_init.js',
            recursive: true,
            //reporter: 'min',
            reporter: 'spec',
            timeout: 2000
        }))
        .on('error', function swallowError(error) {
            // If you want details of the error in the console
            //console.log(`[swallowError] ${error.toString()} [/swallowError]`);
            this.emit('end')
        });
});

gulp.task('watch', ['lint', 'test'], () => {
    gulp.watch(['src/**/*', 'test/**/*'], ['lint', 'test']);
});
