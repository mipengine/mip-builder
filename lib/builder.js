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
 * 设置报告输出对象
 *
 * @param {Object} reporter 报告输出对象
 */
Builder.prototype.setReporter = function (reporter) {
    this.reporter = reporter;
};

/**
 * 通知一个消息，用于提示
 *
 * @param {Object} msg 消息对象
 */
Builder.prototype.notify = function (msg) {
    if (this.reporter) {
        switch (msg.type) {
            case 'PROCESS_FILE':
            case 'PROCESS_ITEM':
                this.reporter.clearLine();
                this.reporter.info('  - ' + msg.body);
                break;

            case 'PROCESS_PROCESSOR_START':
                this.reporter.clearLine();
                this.reporter.info('  - ' + msg.body);
                break;

            case 'PROCESS_PROCESSOR_END':
                this.reporter.clearLine();
                this.reporter.info('  - ' + msg.body);
                this.reporter.info('--------');
                break;

            case 'PROCESS_START':
                this.reporter.info('* ' + msg.body);
                this.reporter.info('--------');
                break;

            case 'PROCESS_END':
                this.reporter.clearLine();
                this.reporter.success('* ' + msg.body + '\n');
                break;

            case 'LOAD_START':
                this.reporter.info('* ' + msg.body);
                break;

            case 'LOAD_END':
                this.reporter.info('* ' + msg.body + '\n');
                break;

            case 'OUTPUT_START':
                this.reporter.info('* ' + msg.body);
                this.reporter.info('--------');
                break;

            case 'OUTPUT_FILE':
                this.reporter.clearLine();
                this.reporter.info('  ' + msg.body);
                break;

            case 'OUTPUT_END':
                this.reporter.clearLine();
                this.reporter.info('* ' + msg.body + '\n');
                break;

            case 'BUILD_START':
                // this.reporter.info('-> ' + msg.body);
                break;

            case 'BUILD_END':
                this.reporter.success(msg.body);
                break;
        }
    }
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

        var startTime = new Date();
        this.notify({
            type: 'LOAD_START',
            body: 'Files loading ...'
        });

        traverseDir(this.options.dir, this);

        var files = this.files;
        var selectedFlag = [];

        // select by selectors
        var fileSelectors = this.options.files;
        fileSelectors.unshift('**/*');
        fileSelectors.forEach(function (selector) {
            var isExclude = selector.indexOf('!') === 0;
            if (isExclude) {
                selector = selector.slice(1);
            }

            files.forEach(function (file, index) {
                var isMatch = minimatch(
                    file.relativePath,
                    selector,
                    {matchBase: true}
                );

                if (isMatch) {
                    selectedFlag[index] = !isExclude;
                }
            });
        });

        this.files = files
            .filter(function (file, index) {
                return !!selectedFlag[index];
            })
            .map(function (file) {
                return new FileInfo(file);
            });

        this.notify({
            type: 'LOAD_END',
            body: 'Files loaded! (' + (new Date() - startTime) + 'ms)'
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

    var startTime = new Date();
    this.notify({
        type: 'PROCESS_START',
        body: 'Files process start ...'
    });

    this.options.processors.forEach(function (processor) {
        if (Object.getPrototypeOf(processor) === Object.prototype) {
            var CustomProcessor = MipProcessor.derive(processor);
            processor = new CustomProcessor();
        }

        if (processor) {
            returnPromise = returnPromise.then(function () {
                return processor.process(this);
            }.bind(this));
        }
    }, this);

    returnPromise = returnPromise.then(function () {
        this.notify({
            type: 'PROCESS_END',
            body: 'Files process finished! (' + (new Date() - startTime) + 'ms)'
        });
    }.bind(this));

    return returnPromise;
};

/**
 * 将构建结果输出到设置目录
 *
 * @return {Promise}
 */
Builder.prototype.output = function () {
    var outputDir = this.options.outputDir;

    var startTime = new Date();
    this.notify({
        type: 'OUTPUT_START',
        body: 'Output start ...'
    });

    this.files.forEach(function (file) {
        if (file.outputPath) {
            var outputPaths = file.outputPaths || [];
            var fileBuffer = file.getDataBuffer();

            outputPaths.push(file.outputPath);
            outputPaths.forEach(function (outputPath) {
                var outputFile = path.resolve(outputDir, outputPath);
                mkdirp.sync(path.dirname(outputFile));
                fs.writeFileSync(outputFile, fileBuffer);

                this.notify({
                    type: 'OUTPUT_FILE',
                    body: '[Output] ' + outputPath
                });
            }, this);
        }
    }, this);

    this.notify({
        type: 'OUTPUT_END',
        body: 'Output finished! (' + (new Date() - startTime) + 'ms)'
    });

    return Promise.resolve();
};

/**
 * 构建启动入口
 *
 * @return {Promise}
 */
Builder.prototype.build = function () {
    var startTime = new Date();
    this.notify({
        type: 'BUILD_START',
        body: 'Building start'
    });

    return this.prepare()
        .then(this.process.bind(this))
        .then(this.output.bind(this))
        .then(function () {
            this.notify({
                type: 'BUILD_END',
                body: 'Builded! (' + (new Date() - startTime) + 'ms)'
            });
        }.bind(this));
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

