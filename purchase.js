const grpc = require("@grpc/grpc-js");
const fs = require("fs");
const protoLoader = require("@grpc/proto-loader");
const rchainToolkit = require("rchain-toolkit");
const uuidv4 = require("uuid/v4");
require("dotenv").config();

const { getProcessArgv, log } = require("./utils");
const main = async () => {
  const privateKey = getProcessArgv("--private-key");
  const registryUri = getProcessArgv("--registry-uri-entry");

  const timestamp = new Date().valueOf();

  if (!privateKey) {
    log("Please provide --private-key and --public-key cli parameters");
    process.exit();
  }

  const publicKey = rchainToolkit.utils.publicKeyFromPrivateKey(privateKey);
  log("publicKey : " + publicKey);

  if (!registryUri) {
    log("Please provide --registry-uri-entry cli parameter");
    process.exit();
  }

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

  const httpUrlReadOnly = `${process.env.READ_ONLY_HOST}:${process.env.READ_ONLY_HTTP_PORT}`;

  const grpcProposeClient = await rchainToolkit.grpc.getGrpcProposeClient(
    `${process.env.VALIDATOR_HOST}:${process.env.VALIDATOR_GRPC_PROPOSE_PORT}`
      .replace("http://", "")
      .replace("https://", ""),
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
    )[0].seqNum;
  } catch (err) {
    log("Unable to get last finalized block");
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

  const nameJson = fs.readFileSync("./name.json", "utf8");

  const nonce = uuidv4().replace(/-/g, "");
  log('Replaced "NONCE" (found in rholang), with ' + nonce);

  const term = `new entryCh,
returnCh,
lookup(\`rho:registry:lookup\`),
stdout(\`rho:io:stdout\`) in {

  lookup!(\`rho:id:${registryUri}\`, *entryCh) |

  for(entry <- entryCh) {
    entry!((
      {
        "type": "CREATE",
        "payload": ${nameJson}
      },
      *returnCh
    )) |
    for (@res <- returnCh) {
      match res {
        true => {
          stdout!("purchase succesfull")
        }
        _ => {
          stdout!(res)
        }
      }
    }
  }
}
`.replace(new RegExp("NONCE", "g"), nonce);

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
      httpUrlReadOnly,
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

  try {
    await rchainToolkit.grpc.propose({}, grpcProposeClient);
  } catch (err) {
    log("Unable to propose", "warning");
    console.log(err);
  }

  log("Purchase deployed successfully !");
  log("");
  log(
    `If available, the name ${
      JSON.parse(nameJson).name
    } should appear soon in dappy browser`
  );
};

main();
