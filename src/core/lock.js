var _locked = false;

/**
 * 尝试获取脚本级互斥锁。
 */
function tryLock() {
  if (_locked) {
    return false;
  }
  _locked = true;
  return true;
}

/**
 * 释放脚本级互斥锁。
 */
function unlock() {
  _locked = false;
}

module.exports = {
  tryLock: tryLock,
  unlock: unlock
};

