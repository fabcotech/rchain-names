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
    unforgeables: [
      {
        g_private_body: {
          id: Buffer.from(unforgeableName, "hex")
        }
      }
    ]
  };
};
