function createContext() {
  return {
    state: "INIT",
    retry: 0
  };
}

module.exports = {
  createContext: createContext
};

