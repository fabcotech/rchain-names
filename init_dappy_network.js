const grpc = require("@grpc/grpc-js");
const fs = require("fs");
const protoLoader = require("@grpc/proto-loader");
const rchainToolkit = require("rchain-toolkit");
require("dotenv").config();

const { getProcessArgv, buildUnforgeableNameQuery } = require("./utils");
const main = async () => {
  const log = a => {
    console.log(new Date().toISOString(), a);
  };

  const publicKey = getProcessArgv("--public-key");
  const privateKey = getProcessArgv("--private-key");

  const timestamp = new Date().valueOf();

  if (!publicKey || !privateKey) {
    log("Please provide --private-key and --public-key cli arguments");
    process.exit();
  }

  const grpcClient = await rchainToolkit.grpc.getClient(
    `${process.env.HOST}:${process.env.PORT}`,
    grpc,
    protoLoader,
    "deployService"
  );

  const grpcProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    `${process.env.HOST}:${process.env.PROPOSE_PORT}`,
    grpc,
    protoLoader
  );

  const phloLimit = 300000;

  log("host : " + process.env.HOST);
  log("port : " + process.env.PORT);
  log("port (HTTP): " + process.env.HTTP_PORT);
  log("port (propose) : " + process.env.PROPOSE_PORT);
  log("publicKey : " + publicKey);
  log("phlo limit : " + phloLimit);
  log("Deploying ...");

  const rnodeHttpUrl = `${process.env.HOST}:${process.env.HTTP_PORT}`;

  // =====
  // NAMES
  // =====

  let prepareDeployResponse;
  try {
    prepareDeployResponse = await rchainToolkit.http.prepareDeploy(
      rnodeHttpUrl,
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

  let lastFinalizedBlock;
  try {
    lastFinalizedBlock = await rchainToolkit.grpc.lastFinalizedBlock(
      grpcClient
    );
  } catch (err) {
    log("Unable to get last finalized block");
    console.log(err);
    process.exit();
  }

  const lastFinalizedBlockValue = parseInt(
    lastFinalizedBlock.blockInfo.blockNumber
  );

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
    lastFinalizedBlockValue || -1
  );

  try {
    const deployResponse = await rchainToolkit.http.deploy(
      rnodeHttpUrl,
      deployOptions
    );
    if (!deployResponse.startsWith('"Success!')) {
      log("Unable to deploy");
      console.log(deployResponse.error.messages);
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
  } catch (err) {
    log("Unable to propose");
    console.log(err);
    process.exit();
  }

  log("Proposed (1st proposal for names.rho)");

  await new Promise(res => {
    setTimeout(res, 2000);
  });

  const unforgeableNameQuery = buildUnforgeableNameQuery(
    unforgeableNameFromNode
  );

  let dataAtNameResponse;
  try {
    dataAtNameResponse = await rchainToolkit.http.dataAtName(rnodeHttpUrl, {
      name: unforgeableNameQuery,
      depth: 1000
    });
  } catch (err) {
    log("Cannot retreive transaction data");
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
      rnodeHttpUrl,
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
    lastFinalizedBlockValue || -1
  );

  try {
    const deployResponse = await rchainToolkit.http.deploy(
      rnodeHttpUrl,
      deployOptions2
    );
    if (!deployResponse.startsWith('"Success!')) {
      log("Unable to deploy");
      console.log(deployResponse.error.messages);
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
  } catch (err) {
    log("Unable to propose");
    console.log(err);
    process.exit();
  }

  log("Proposed (2nd proposal for nodes.rho)");
  await new Promise(res => {
    setTimeout(res, 2000);
  });

  const unforgeableNameQuery2 = buildUnforgeableNameQuery(
    unforgeableNameFromNode2
  );

  let dataAtNameResponse2;
  try {
    dataAtNameResponse2 = await rchainToolkit.http.dataAtName(rnodeHttpUrl, {
      name: unforgeableNameQuery2,
      depth: 1000
    });
  } catch (err) {
    log("Cannot retreive transaction data");
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

  console.log(namesDeployJsObject);
  log("Dappy network deployed successfully !");
  log("");
  log("Your Dappy network variables :");
  log(
    "RCHAIN_NAMES_UNFORGEABLE_NAME_ID : " +
      namesDeployJsObject.unforgeable_name.UnforgPrivate
  );
  log(
    "RCHAIN_NAMES_REGISTRY_URI :        " +
      namesDeployJsObject.registry_uri.replace("rho:id:", "")
  );
  log(
    "DAPPY_NODES_UNFORGEABLE_NAME_ID :  " +
      nodesDeployJsObject.unforgeable_name.UnforgPrivate
  );
  log(
    "DAPPY_NODES_REGISTRY_URI :         " +
      nodesDeployJsObject.registry_uri.replace("rho:id:", "") +
      "\n"
  );
};

main();
