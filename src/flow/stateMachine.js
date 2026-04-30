/**
 * 创建状态机运行上下文初始状态。
 */
function createContext() {
  return {
    state: "INIT",
    retry: 0
  };
}

module.exports = {
  createContext: createContext
};

