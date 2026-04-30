/**
 * 创建带错误码与详情的标准错误对象。
 * @param {*} code
 * @param {*} message
 * @param {*} details
 */
function createError(code, message, details) {
  var err = new Error(message || "Unknown error");
  err.code = code || "E-UNKNOWN";
  err.details = details || null;
  return err;
}

module.exports = {
  createError: createError
};

