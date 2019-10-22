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

  let timestamp = new Date().valueOf();

  if (!publicKey || !privateKey) {
    log("Please provide --private-key and --public-key cli arguments");
    process.exit();
  }

  const grpcClient = await rchainToolkit.grpc.getGrpcDeployClient(
    `${process.env.HOST}:${process.env.PORT}`,
    grpc,
    protoLoader
  );

  const grpcProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    `${process.env.HOST}:${process.env.PROPOSE_PORT}`,
    grpc,
    protoLoader
  );

  const phloLimit = 20000;

  log("host : " + process.env.HOST);
  log("port : " + process.env.PORT);
  log("port (propose) : " + process.env.PROPOSE_PORT);
  log("publicKey : " + publicKey);
  log("phlo limit : " + phloLimit);
  log("Deploying ...\n");

  // =====
  // NAMES
  // =====

  let privateNamePreviewResponse;
  try {
    privateNamePreviewResponse = await rchainToolkit.grpc.previewPrivateNames(
      {
        user: Buffer.from(publicKey, "hex"),
        timestamp: timestamp,
        nameQty: 1
      },
      grpcClient
    );
  } catch (err) {
    log("Unable to preview private name");
    console.log(err);
    process.exit();
  }

  let unforgeableNameFromNode;
  try {
    unforgeableNameFromNode = rchainToolkit.utils.unforgeableWithId(
      privateNamePreviewResponse.payload.ids[0]
    );
  } catch (err) {
    log("Unable to preview private name");
    process.exit();
  }

  const term = fs.readFileSync("./names.rho", "utf8");
  const deployData = await rchainToolkit.utils.getDeployData(
    "secp256k1",
    timestamp,
    term,
    privateKey,
    publicKey,
    1,
    phloLimit,
    -1
  );

  try {
    const deployResponse = await rchainToolkit.grpc.doDeploy(
      deployData,
      grpcClient
    );
    if (deployResponse.error) {
      log("Unable to deploy");
      console.log(deployResponse.error.messages);
      process.exit();
    }
  } catch (err) {
    log("Unable to deploy");
    console.log(err);
    process.exit();
  }

  try {
    await rchainToolkit.grpc.propose({}, grpcProposeClient);
  } catch (err) {
    log("Unable to propose");
    console.log(err);
    process.exit();
  }
  await new Promise(res => {
    setTimeout(res, 2000);
  });

  const unforgeableNameQuery = buildUnforgeableNameQuery(
    unforgeableNameFromNode
  );

  let listenForDataAtNameResponse;
  try {
    listenForDataAtNameResponse = await rchainToolkit.grpc.listenForDataAtName(
      {
        name: unforgeableNameQuery,
        depth: 1000
      },
      grpcClient
    );
  } catch (err) {
    log("Cannot retreive transaction data");
    console.log(err);
    process.exit();
  }

  const data = rchainToolkit.utils.getValueFromBlocks(
    listenForDataAtNameResponse.payload.blockInfo
  );

  if (!data.exprs.length) {
    log("Transaction data not found");
    process.exit();
    return;
  }

  const namesDeployJsObject = rchainToolkit.utils.rholangMapToJsObject(
    data.exprs[0].e_map_body
  );

  // NODES

  timestamp = new Date().valueOf();

  let privateNamePreviewResponse2;
  try {
    privateNamePreviewResponse2 = await rchainToolkit.grpc.previewPrivateNames(
      {
        user: Buffer.from(publicKey, "hex"),
        timestamp: timestamp,
        nameQty: 1
      },
      grpcClient
    );
  } catch (err) {
    log("Unable to preview private name");
    console.log(err);
    process.exit();
  }

  let unforgeableNameFromNode2;
  try {
    unforgeableNameFromNode2 = rchainToolkit.utils.unforgeableWithId(
      privateNamePreviewResponse2.payload.ids[0]
    );
  } catch (err) {
    log("Unable to preview private name");
    process.exit();
  }

  const term2 = fs.readFileSync("./nodes.rho", "utf8");
  const deployData2 = await rchainToolkit.utils.getDeployData(
    "secp256k1",
    timestamp,
    term2,
    privateKey,
    publicKey,
    1,
    phloLimit,
    -1
  );

  try {
    const deployResponse = await rchainToolkit.grpc.doDeploy(
      deployData2,
      grpcClient
    );
    if (deployResponse.error) {
      log("Unable to deploy");
      console.log(deployResponse.error.messages);
      process.exit();
    }
  } catch (err) {
    log("Unable to deploy");
    console.log(err);
    process.exit();
  }

  try {
    await rchainToolkit.grpc.propose({}, grpcProposeClient);
  } catch (err) {
    log("Unable to propose");
    console.log(err);
    process.exit();
  }
  await new Promise(res => {
    setTimeout(res, 2000);
  });

  const unforgeableNameQuery2 = buildUnforgeableNameQuery(
    unforgeableNameFromNode
  );

  let listenForDataAtNameResponse2;
  try {
    listenForDataAtNameResponse2 = await rchainToolkit.grpc.listenForDataAtName(
      {
        name: unforgeableNameQuery2,
        depth: 1000
      },
      grpcClient
    );
  } catch (err) {
    log("Cannot retreive transaction data");
    console.log(err);
    process.exit();
  }

  const data2 = rchainToolkit.utils.getValueFromBlocks(
    listenForDataAtNameResponse2.payload.blockInfo
  );

  if (!data2.exprs.length) {
    log("Transaction data not found");
    process.exit();
    return;
  }

  const nodesDeployJsObject = rchainToolkit.utils.rholangMapToJsObject(
    data2.exprs[0].e_map_body
  );

  log("Dappy network deployed successfully !");
  log("");
  log("Your Dappy network variables :");
  log(
    "RCHAIN_NAMES_UNFORGEABLE_NAME_ID : " +
      namesDeployJsObject.unforgeable_name[0].gPrivate
  );
  log(
    "RCHAIN_NAMES_REGISTRY_URI :        " +
      namesDeployJsObject.registry_uri.replace("rho:id:", "")
  );
  log(
    "DAPPY_NODES_UNFORGEABLE_NAME_ID :  " +
      nodesDeployJsObject.unforgeable_name[0].gPrivate
  );
  log(
    "DAPPY_NODES_REGISTRY_URI :         " +
      nodesDeployJsObject.registry_uri.replace("rho:id:", "")
  );
};

main();
