module.exports.log = (a, level = "info") => {
  if (level === "warning") {
    console.log("\x1b[33m%s\x1b[0m", new Date().toISOString() + " [WARN] " + a);
  } else if (level === "error") {
    console.log(
      "\x1b[31m%s\x1b[0m",
      new Date().toISOString() + " [ERROR] " + a
    );
  } else {
    console.log(new Date().toISOString(), a);
  }
};

module.exports.getProcessArgv = param => {
  const index = process.argv.findIndex(arg => arg === param);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
};

// Careful, it is different than the function that build
// the unforgeable query for dappy-node
module.exports.buildUnforgeableNameQuery = unforgeableName => {
  return {
    UnforgPrivate: { data: unforgeableName }
  };
};
