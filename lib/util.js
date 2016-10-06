/**
 * @file 一些比较杂的功能函数
 * @author errorrik(errorrik@gmail.com)
 */


/**
 * @param {Buffer} buffer 判断buffer是不是二进制的内容.
 * @return {boolean}
 */
exports.isBinary = function (buffer) {
    // 该检测方法为王杨提供
    var hexString = buffer.toString(
        'hex',
        0,
        Math.min(buffer.length, 4096)
    );

    while (1) {
        var zzIndex = hexString.indexOf('00');
        if (zzIndex < 0) {
            return false;
        }
        else if (zzIndex % 2 === 0) {
            return true;
        }

        hexString = hexString.slice(zzIndex + 1);
    }
};

