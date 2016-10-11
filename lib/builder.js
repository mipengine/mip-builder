/**
 * @file 构建功能
 * @author errorrik(errorrik@gmail.com)
 */


var objectAssign = require('object-assign');
var minimatch = require('minimatch');
var mkdirp = require('mkdirp');
var MipProcessor = require('mip-processor');
var fs = require('fs');
var path = require('path');
var FileInfo = require('./file-info');

/**
 * 默认参数
 */
var DEFAULT_OPTIONS = {
    files: []
};

/**
 * 构建功能类
 *
 * @param {Object} options 构建参数
 * @param {string} options.dir 构建目录路径
 * @param {string} options.outputDir 输出目录路径
 * @param {Array} options.files 选择构建文件
 * @param {Array} options.processors 构建处理器集合
 */
function Builder(options) {
    this.options = objectAssign({files: []}, options);
    this.files = [];
}

/**
 * 获取要处理的文件列表
 *
 * @return {Array.<FileInfo>}
 */
Builder.prototype.getFiles = function () {
    return this.files;
};

/**
 * 构建准备，主要是读入文件
 *
 * @return {Promise}
 */
Builder.prototype.prepare = function () {
    return new Promise(function (resolve, reject) {
        if (this.isPrepared) {
            resolve();
            return;
        }

        traverseDir(this.options.dir, this);
        var fileSelectors = this.options.files;

        this.files = this.files
            .filter(function (file) {
                var isMatch = true;
                fileSelectors.forEach(function (selector) {
                    isMatch = isMatch && minimatch(
                        file.relativePath,
                        selector,
                        {matchBase: true}
                    );
                });

                return isMatch;
            })
            .map(function (file) {
                return new FileInfo(file);
            });

        this.isPrepared = true;
        resolve();
    }.bind(this));
};

/**
 * 构建处理，使用设置好的 processor 挨个进行处理
 *
 * @return {Promise}
 */
Builder.prototype.process = function () {
    var returnPromise = Promise.resolve();
    var me = this;

    this.options.processors.forEach(function (processor) {
        if (!(processor instanceof MipProcessor) && typeof processor === 'object') {
            var CustomProcessor = MipProcessor.derive(processor);
            processor = new CustomProcessor();
        }

        returnPromise = returnPromise.then(processor.process(me));
    });

    return returnPromise;
};

/**
 * 将构建结果输出到设置目录
 *
 * @return {Promise}
 */
Builder.prototype.output = function () {
    var outputDir = this.options.outputDir;

    this.files.forEach(function (file) {
        if (file.outputPath) {
            var outputPaths = file.outputPaths || [];
            var fileBuffer = file.getDataBuffer();

            outputPaths.push(file.outputPath);
            outputPaths.forEach(function (outputPath) {
                var outputFile = path.resolve(outputDir, outputPath);
                mkdirp.sync(path.dirname(outputFile));
                fs.writeFileSync(outputFile, fileBuffer);
            });
        }
    });

    return Promise.resolve();
};

/**
 * 构建启动入口
 *
 * @return {Promise}
 */
Builder.prototype.build = function () {
    return this.prepare()
        .then(this.process.bind(this))
        .then(this.output.bind(this));
};

/**
 * 通过路径获取文件信息对象
 *
 * @param {string} filePath 文件路径，可以是绝对路径，也可以是相对构建根的路径
 * @return {FileInfo}
 */
Builder.prototype.getFile = function (filePath) {
    var isAbsolute = /[a-z]:/i.test(filePath) || filePath.indexOf('/') === 0;
    if (!isAbsolute) {
        filePath = filePath.replace(/\\/g, '/');
    }

    return this.files.find(function (file) {
        return file[isAbsolute ? 'fullPath' : 'relativePath'] === filePath;
    });
};

/**
 * 遍历目录，用于 prepare 阶段文件筛选
 *
 * @inner
 * @param {string} dir 要遍历的目录
 * @param {Builder} builder 构建器对象
 */
function traverseDir(dir, builder) {
    var files = fs.readdirSync(dir);

    files.forEach(function (file) {
        var fullPath = path.resolve(dir, file);
        var relativePath = path.relative(builder.options.dir, fullPath).replace(/\\/g, '/');

        var stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            traverseDir(fullPath, builder);
        }
        else {
            builder.files.push({
                fullPath: fullPath,
                relativePath: relativePath
            });
        }
    });
}

module.exports = exports = Builder;

