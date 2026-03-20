var _locked = false;

function tryLock() {
  if (_locked) {
    return false;
  }
  _locked = true;
  return true;
}

function unlock() {
  _locked = false;
}

module.exports = {
  tryLock: tryLock,
  unlock: unlock
};

