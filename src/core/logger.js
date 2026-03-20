function nowText() {
  var d = new Date();
  var z = function (n, w) {
    var s = String(n);
    while (s.length < w) s = "0" + s;
    return s;
  };
  return d.getFullYear()
    + "-" + z(d.getMonth() + 1, 2)
    + "-" + z(d.getDate(), 2)
    + " " + z(d.getHours(), 2)
    + ":" + z(d.getMinutes(), 2)
    + ":" + z(d.getSeconds(), 2)
    + "." + z(d.getMilliseconds(), 3);
}

function log(level, tag, message, payload) {
  var line = "[" + nowText() + "][" + level + "][" + tag + "] " + message;
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

