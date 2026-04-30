function log(level, tag, message, payload) {
  var line = "[" + level + "][" + tag + "] " + message;
  if (payload !== undefined) {
    line += " " + JSON.stringify(payload);
  }
  console.log(line);
}

module.exports = {
  debug: function (tag, message, payload) { log("DEBUG", tag, message, payload); },
  info: function (tag, message, payload) { log("INFO", tag, message, payload); },
  warn: function (tag, message, payload) { log("WARN", tag, message, payload); },
  error: function (tag, message, payload) { log("ERROR", tag, message, payload); }
};
