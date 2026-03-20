function createError(code, message, details) {
  var err = new Error(message || "Unknown error");
  err.code = code || "E-UNKNOWN";
  err.details = details || null;
  return err;
}

module.exports = {
  createError: createError
};

