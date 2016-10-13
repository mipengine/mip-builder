var Builder = require('../index');
var path = require('path');
var fs = require('fs');

function rmdir( path ) {
    var fs = require( 'fs' );

    if ( fs.existsSync( path ) && fs.statSync( path ).isDirectory() ) {
        fs.readdirSync( path ).forEach(
            function ( file ) {
                var fullPath = require( 'path' ).join( path, file );
                if ( fs.statSync( fullPath ).isDirectory() ) {
                    rmdir( fullPath );
                }
                else {
                    fs.unlinkSync( fullPath );
                }
            }
        );

        fs.rmdirSync( path );
    }
};

function fileExists(file) {
    try {
        return fs.statSync(file).isFile();
    }
    catch (e) {
        if (e.code != 'ENOENT')
          throw e;

        return false;
    }
}

describe("Builder", function () {

    it("prepare will exclude hidden file by default", function (done) {
        var builder = new Builder({
            dir: path.resolve(__dirname, 'target'),

            files: []
        });

        builder.prepare().then(function () {
            var files = builder.getFiles();
            files.forEach(function (file) {
                expect(file.fullPath.indexOf('editorconfig')).toBe(-1);
            });

            done();
        });
    });

    it("prepare will load all files which select by files option", function (done) {
        var builder = new Builder({
            dir: path.resolve(__dirname, 'target'),

            files: [
                '!README.md',
                '!demo/**/*'
            ]
        });

        builder.prepare().then(function () {
            var files = builder.getFiles();
            files.forEach(function (file) {
                expect(file.fullPath.indexOf('README')).toBe(-1);
                expect(file.fullPath.indexOf('demo')).toBe(-1);
            });

            done();
        });
    });

    it("load file content will detect file type", function (done) {
        var builder = new Builder({
            dir: path.resolve(__dirname, 'target'),

            files: [
                '!README.md',
                '!demo/**/*'
            ]
        });

        builder.prepare().then(function () {
            var files = builder.getFiles();
            files.forEach(function (file) {
                if (/jpg$/.test(file.fullPath)) {
                    expect(file.getData() instanceof Buffer).toBeTruthy();
                }
                else {
                    expect(typeof file.getData()).toBe('string');
                }
            });

            done();
        });
    });

    it("process method will do process all files which select by processor files option", function (done) {
        var builder = new Builder({
            dir: path.resolve(__dirname, 'target'),

            files: [
                '!README.md',
                '!demo/**/*'
            ],

            processors: [
                {
                    files: ["*.js"],
                    processFile: function (file) {
                        file.setData('processed!' + file.getData());
                    }
                }
            ]
        });

        builder.prepare()
            .then(builder.process.bind(builder))
            .then(function () {
                var files = builder.getFiles();
                files.forEach(function (file) {
                    if (/\.js$/.test(file.fullPath)) {
                        expect(file.getData().indexOf('processed!')).toBe(0);
                    }
                    else {
                        expect(file.getData().indexOf('processed!')).not.toBe(0);
                    }
                });

                done();
            });
    });

    it("output method will gen all files to outputDir", function (done) {
        var builder = new Builder({
            dir: path.resolve(__dirname, 'target'),

            files: [
                '!README.md',
                '!demo/**/*'
            ],

            processors: [
                {
                    files: ["*.js"],
                    processFile: function (file) {
                        file.setData('processed!' + file.getData());
                    }
                }
            ],

            outputDir: path.resolve(__dirname, 'dist')
        });

        builder.prepare()
            .then(builder.process.bind(builder))
            .then(builder.output.bind(builder))
            .then(function () {
                expect(
                    fs.readFileSync(
                        path.resolve(__dirname, 'dist', 'index.html'),
                        'UTF-8'
                    ).indexOf('processed!')
                ).not.toBe(0);
                expect(
                    fs.readFileSync(
                        path.resolve(__dirname, 'dist', 'src', 'main.js'),
                        'UTF-8'
                    ).indexOf('processed!')
                ).toBe(0);


                expect(fileExists(path.resolve(__dirname, 'dist', 'img', 'photo.jpg'))).toBeTruthy();
                expect(fileExists(path.resolve(__dirname, 'dist', 'README.md'))).not.toBeTruthy();

                rmdir(path.resolve(__dirname, 'dist'));
                done();
            });
    });

    it("build method will do prepare、process and output", function (done) {
        var builder = new Builder({
            dir: path.resolve(__dirname, 'target'),

            files: [
                '!README.md',
                '!demo/**/*'
            ],

            processors: [
                {
                    files: ["*.js"],
                    processFile: function (file) {
                        file.setData('processed!' + file.getData());
                    }
                }
            ],

            outputDir: path.resolve(__dirname, 'dist')
        });

        builder.build()
            .then(function () {
                expect(
                    fs.readFileSync(
                        path.resolve(__dirname, 'dist', 'index.html'),
                        'UTF-8'
                    ).indexOf('processed!')
                ).not.toBe(0);
                expect(
                    fs.readFileSync(
                        path.resolve(__dirname, 'dist', 'src', 'main.js'),
                        'UTF-8'
                    ).indexOf('processed!')
                ).toBe(0);

                expect(fileExists(path.resolve(__dirname, 'dist', 'img', 'photo.jpg'))).toBeTruthy();
                expect(fileExists(path.resolve(__dirname, 'dist', 'README.md'))).not.toBeTruthy();

                rmdir(path.resolve(__dirname, 'dist'));
                done();
            });
    });


});
