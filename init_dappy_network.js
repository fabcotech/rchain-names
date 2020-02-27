const grpc = require("@grpc/grpc-js");
const fs = require("fs");
const protoLoader = require("@grpc/proto-loader");
const rchainToolkit = require("rchain-toolkit");
require("dotenv").config();

const { getProcessArgv, buildUnforgeableNameQuery, log } = require("./utils");
const main = async () => {
  const privateKey = getProcessArgv("--private-key");

  const timestamp = new Date().valueOf();

  if (!privateKey) {
    log("Please provide --private-key and --public-key cli arguments");
    process.exit();
  }

  const publicKey = rchainToolkit.utils.publicKeyFromPrivateKey(privateKey);
  log("publicKey : " + publicKey);

  const phloLimit = 300000;

  if (
    !process.env.READ_ONLY_HOST.startsWith("https://") &&
    !process.env.READ_ONLY_HOST.startsWith("http://")
  ) {
    log("READ_ONLY_HOST must start with http:// or https://", "error");
    process.exit();
  }
  if (
    !process.env.VALIDATOR_HOST.startsWith("https://") &&
    !process.env.VALIDATOR_HOST.startsWith("http://")
  ) {
    log("VALIDATOR_HOST must start with http:// or https://", "error");
    process.exit();
  }
  log("host (read-only):                   " + process.env.READ_ONLY_HOST);
  log("host (read-only) HTTP port:         " + process.env.READ_ONLY_HTTP_PORT);
  log("host (validator):                   " + process.env.VALIDATOR_HOST);
  log("host (validator) HTTP port:         " + process.env.VALIDATOR_HTTP_PORT);
  log(
    "host (validator) GRPC propose port: " +
      process.env.VALIDATOR_GRPC_PROPOSE_PORT
  );

  let httpUrlReadOnly = `${process.env.READ_ONLY_HOST}:${process.env.READ_ONLY_HTTP_PORT}`;
  if (!process.env.READ_ONLY_HTTP_PORT) {
    httpUrlReadOnly = process.env.READ_ONLY_HOST;
  }
  let httpUrlValidator = `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_HTTP_PORT}`;
  if (!process.env.VALIDATOR_HTTP_PORT) {
    httpUrlValidator = process.env.VALIDATOR_HOST;
  }
  const grpcUrlValidator = `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_GRPC_PROPOSE_PORT}`;

  const grpcProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    grpcUrlValidator.replace("http://", "").replace("https://", ""),
    grpc,
    protoLoader
  );

  // =====
  // NAMES
  // =====

  let prepareDeployResponse;
  try {
    prepareDeployResponse = await rchainToolkit.http.prepareDeploy(
      httpUrlReadOnly,
      {
        deployer: publicKey,
        timestamp: timestamp,
        nameQty: 1
      }
    );
  } catch (err) {
    log("Unable to preview private name");
    console.log(err);
    process.exit();
  }

  let validAfterBlockNumber;
  try {
    validAfterBlockNumber = JSON.parse(
      await rchainToolkit.http.blocks(httpUrlReadOnly, {
        position: 1
      })
    )[0].blockNumber;
  } catch (err) {
    log("Unable to get last finalized block", "error");
    console.log(err);
    process.exit();
  }

  let unforgeableNameFromNode;
  try {
    unforgeableNameFromNode = JSON.parse(prepareDeployResponse).names[0];
  } catch (err) {
    log("Unable to preview private name");
    process.exit();
  }

  const term = fs.readFileSync("./names.rho", "utf8");
  const deployOptions = await rchainToolkit.utils.getDeployOptions(
    "secp256k1",
    timestamp,
    term,
    privateKey,
    publicKey,
    1,
    phloLimit,
    validAfterBlockNumber || -1
  );

  try {
    const deployResponse = await rchainToolkit.http.deploy(
      httpUrlValidator,
      deployOptions
    );
    if (!deployResponse.startsWith('"Success!')) {
      log("Unable to deploy");
      console.log(deployResponse);
      process.exit();
    }
  } catch (err) {
    log("Unable to deploy");
    console.log(err);
    process.exit();
  }
  log("Deployed names.rho");

  try {
    await rchainToolkit.grpc.propose({}, grpcProposeClient);
    log("Proposed (1st proposal for names.rho)");
  } catch (err) {
    log("Unable to propose, skipping propose", "warning");
    console.log(err);
  }

  const unforgeableNameQuery = buildUnforgeableNameQuery(
    unforgeableNameFromNode
  );

  let dataAtNameResponse;

  try {
    dataAtNameResponse = await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          rchainToolkit.http
            .dataAtName(httpUrlValidator, {
              name: unforgeableNameQuery,
              depth: 5
            })
            .then(dataAtNameResponse => {
              if (
                dataAtNameResponse &&
                JSON.parse(dataAtNameResponse).exprs.length
              ) {
                resolve(dataAtNameResponse);
                clearInterval(interval);
              } else {
                log(
                  "Did not find transaction data, will try again in 10 seconds"
                );
              }
            });
        } catch (err) {
          log("Cannot retreive transaction data, will try again in 10 seconds");
        }
      }, 10000);
    });
  } catch (err) {
    log("Failed to parse dataAtName response", "error");
    console.log(err);
    process.exit();
  }

  const parsedResponse = JSON.parse(dataAtNameResponse);
  const data = parsedResponse.exprs[parsedResponse.exprs.length - 1];

  if (!data || !data.expr) {
    log("Transaction data not found");
    process.exit();
  }

  const namesDeployJsObject = rchainToolkit.utils.rhoValToJs(data.expr);

  // NODES

  const timestamp2 = new Date().valueOf();

  let prepareDeployResponse2;
  try {
    prepareDeployResponse2 = await rchainToolkit.http.prepareDeploy(
      httpUrlReadOnly,
      {
        deployer: publicKey,
        timestamp: timestamp2,
        nameQty: 1
      }
    );
  } catch (err) {
    log("Unable to preview private name");
    console.log(err);
    process.exit();
  }

  let unforgeableNameFromNode2;
  try {
    unforgeableNameFromNode2 = JSON.parse(prepareDeployResponse2).names[0];
  } catch (err) {
    log("Unable to preview private name");
    process.exit();
  }

  const term2 = fs.readFileSync("./nodes.rho", "utf8");
  const deployOptions2 = await rchainToolkit.utils.getDeployOptions(
    "secp256k1",
    timestamp2,
    term2,
    privateKey,
    publicKey,
    1,
    phloLimit,
    validAfterBlockNumber || -1
  );

  try {
    const deployResponse = await rchainToolkit.http.deploy(
      httpUrlValidator,
      deployOptions2
    );
    if (!deployResponse.startsWith('"Success!')) {
      log("Unable to deploy");
      console.log(deployResponse);
      process.exit();
    }
  } catch (err) {
    log("Unable to deploy");
    console.log(err);
    process.exit();
  }

  log("Deployed nodes.rho");

  try {
    await rchainToolkit.grpc.propose({}, grpcProposeClient);
    log("Proposed (2nd proposal for nodes.rho)");
  } catch (err) {
    log("Unable to propose, skipping propose", "warning");
    console.log(err);
  }

  const unforgeableNameQuery2 = buildUnforgeableNameQuery(
    unforgeableNameFromNode2
  );

  let dataAtNameResponse2;
  try {
    dataAtNameResponse2 = await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          rchainToolkit.http
            .dataAtName(httpUrlValidator, {
              name: unforgeableNameQuery2,
              depth: 5
            })
            .then(dataAtNameResponse => {
              if (
                dataAtNameResponse &&
                JSON.parse(dataAtNameResponse).exprs.length
              ) {
                resolve(dataAtNameResponse);
                clearInterval(interval);
              } else {
                log(
                  "Did not find transaction data, will try again in 10 seconds"
                );
              }
            });
        } catch (err) {
          log("Cannot retreive transaction data, will try again in 10 seconds");
        }
      }, 10000);
    });
  } catch (err) {
    log("Failed to parse dataAtName response", "error");
    console.log(err);
    process.exit();
  }

  const parsedResponse2 = JSON.parse(dataAtNameResponse2);

  const data2 = parsedResponse2.exprs[parsedResponse2.exprs.length - 1];

  if (!data2 || !data2.expr) {
    log("Transaction data not found");
    process.exit();
  }

  const nodesDeployJsObject = rchainToolkit.utils.rhoValToJs(data2.expr);

  log("Dappy network deployed successfully !");
  log("");
  log("Your Dappy network variables :");
  console.log(
    "RCHAIN_NAMES_UNFORGEABLE_NAME_ID=" +
      namesDeployJsObject.recordsUnforgeableName.UnforgPrivate +
      "\nRCHAIN_NAMES_REGISTRY_URI=" +
      namesDeployJsObject.recordsRegistryUri.replace("rho:id:", "") +
      "\nRCHAIN_NAMES_REGISTRY_URI_ENTRY=" +
      namesDeployJsObject.entryRegistryUri.replace("rho:id:", "") +
      "\nDAPPY_NODES_UNFORGEABLE_NAME_ID=" +
      nodesDeployJsObject.nodesUnforgeableName.UnforgPrivate +
      "\nDAPPY_NODES_REGISTRY_URI=" +
      nodesDeployJsObject.nodesRegistryUri.replace("rho:id:", "") +
      "\nDAPPY_NODES_REGISTRY_URI_ENTRY= " +
      nodesDeployJsObject.entryRegistryUri.replace("rho:id:", "") +
      "\n"
  );
};

main();
