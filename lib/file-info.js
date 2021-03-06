/**
 * @file 文件处理功能
 * @author errorrik(errorrik@gmail.com)
 */

var fs = require('fs');
var objectAssign = require('object-assign');
var iconv = require('iconv-lite');
var util = require('./util');

/**
 * 文件信息类
 *
 * @class
 * @param {Object} options 初始化选项
 * @param {string} options.relativePath 文件路径，相对于构建目录
 * @param {string} options.fullPath 文件完整路径
 */
function FileInfo(options) {
    objectAssign(this, options);

    var data = fs.readFileSync(this.fullPath);

    // 初始化FileInfo的data属性
    // 二进制文件data为buffer，文本文件data为字符串
    if (!this.fileEncoding) {
        if (util.isBinary(data)) {
            this.data = data;
        }
        else {
            this.fileEncoding = 'UTF-8';
        }
    }

    if (this.fileEncoding) {
        if (/^utf-?8$/i.test(this.fileEncoding)) {
            // 删除UTF-8文件BOM
            if (data[0] === 0xEF
                 && data[1] === 0xBB
                 && data[2] === 0xBF) {
                data = data.slice(3);
            }

            this.data = data.toString(this.fileEncoding);
        }
        else if (iconv.encodingExists(this.fileEncoding)) {
            this.data = iconv.decode(data, this.fileEncoding);
        }
        else {
            this.fileEncoding = null;
            this.data = data;
        }
    }

    this.outputPath = this.relativePath;

    // 保存一份raw data
    // 有的处理器可能直接针对或者获取源数据
    // this.rawData = this.data.slice(0);
}


/**
 * 将数据转换成buffer并返回
 *
 * @return {Buffer}
 */
FileInfo.prototype.getDataBuffer = function () {
    var data = this.data;

    if (typeof data === 'string') {
        if (/^utf-?8$/i.test(this.fileEncoding)) {
            return new Buffer(data, this.fileEncoding);
        }

        return iconv.encode(data, this.fileEncoding);
    }

    return data;
};

/**
 * 设置文件数据
 *
 * @param {Buffer|string} data 文件数据
 */
FileInfo.prototype.setData = function (data) {
    this.data = data;
    this.md5sum = null;
};

/**
 * 获取文件数据
 *
 * @return {Buffer|string}
 */
FileInfo.prototype.getData = function (data) {
    return this.data;
};

/**
 * 获取文件内容的md5签名
 *
 * @param {number=} start 开始位置.
 * @param {number=} end 结束位置.
 * @return {string}
 */
FileInfo.prototype.md5sum = function (start, end) {
    start = start || 0;
    end = end || 32;

    var result = this.md5sum;
    if (result) {
        return result.slice(start, end);
    }

    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    md5.update(this.getDataBuffer());
    result = md5.digest('hex');
    this.md5sum = result;

    return result.slice(start, end);
};

module.exports = exports = FileInfo;
