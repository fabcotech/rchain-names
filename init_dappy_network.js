const grpc = require("@grpc/grpc-js");
const fs = require("fs");
const protoLoader = require("@grpc/proto-loader");
const rchainToolkit = require("rchain-toolkit");
const uuidv4 = require("uuid/v4");
require("dotenv").config();

const prereservedNames = require("./top1000domains").prereservedNames;
const { getProcessArgv, buildUnforgeableNameQuery, log } = require("./utils");
const main = async () => {
  const privateKey = getProcessArgv("--private-key");

  const timestamp = new Date().valueOf();

  if (!privateKey) {
    log("Please provide --private-key cli arguments");
    process.exit();
  }

  const publicKey = rchainToolkit.utils.publicKeyFromPrivateKey(privateKey);
  log("publicKey : " + publicKey);

  let phloLimit = getProcessArgv("--phlo-limit");
  if (phloLimit) {
    phloLimit = parseInt(phloLimit);
    log("Phlo limit (from CLI) :             " + phloLimit);
  } else {
    phloLimit = 300000;
    log("Phlo limit (default) :              " + phloLimit);
  }

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
        nameQty: 1,
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
        position: 1,
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

  let term = fs
    .readFileSync("./names.rho", "utf8")
    .replace(new RegExp("PUBLIC_KEY", "g"), `"${publicKey}"`)
    .replace(new RegExp("NONCE", "g"), `"${uuidv4().replace(/-/g, "")}"`)
    .replace(
      new RegExp("ADDRESS", "g"),
      `"${rchainToolkit.utils.revAddressFromPublicKey(publicKey)}"`
    );

  // { facebook : '{ \"name\": \"facebook\"  etc... }', ...  }
  let prereservedNamesComplete = {};
  if (prereservedNames) {
    prereservedNames.slice(0, 100).forEach((n, i) => {
      const map = `{ "servers": [], "name": "${n}", "address": "${
        process.env.ADDRESS_FOR_PRERESERVED_NAMES
      }", "publicKey": "${publicKey}", "nonce": "${uuidv4().replace(
        /-/g,
        ""
      )}"}`;
      prereservedNamesComplete[n] = map;
    });
  }

  // Old way of recovering names from existing name system
  // Now it must be done onchain
  /*   if (process.env.NAMES_TO_RECOVER_URI) {
    log("Started recovering names from existing name system");
    // todo : change the term to be rholang-files-module v0.4 compatible
    const r = await rchainToolkit.http.exploreDeploy(httpUrlReadOnly, {
      term: `new return, filesModuleCh, readCh, lookup(\`rho:registry:lookup\`) in {
        lookup!(\`rho:id:${process.env.NAMES_TO_RECOVER_URI}\`, *filesModuleCh) |
        for(filesModuleReader <- filesModuleCh) {
          new x in {
            filesModuleReader!(*x) |
            for (y <- x) {
              return!(*y)
            }
          }
        }
      }`,
    });
    const jsValue = rchainToolkit.utils.rhoValToJs(JSON.parse(r).expr[0]);
    const recordsNotInPrereserved = Object.keys(jsValue.records).filter(
      (k) => !prereservedNamesComplete[k]
    );
    console.log(
      `Found ${recordsNotInPrereserved.length} new names (in addition to prereserved) in existing name system :`
    );

    await new Promise((resolve, reject) => {
      let i = 0;
      const getRecord = async () => {
        const name = recordsNotInPrereserved[i];
        if (i % 10 === 0) {
          log(`Now at index ${i} : ${name}`);
        }
        const r = await rchainToolkit.http.exploreDeploy(httpUrlReadOnly, {
          term: `new return, recordCh, readCh, lookup(\`rho:registry:lookup\`) in {
            lookup!(\`${jsValue.records[name]}\`, *recordCh) |
            for(record <- recordCh) {
              return!(*record)
            }
          }`,
        });
        const record = rchainToolkit.utils.rhoValToJs(JSON.parse(r).expr[0]);
        prereservedNamesComplete[name] = JSON.stringify(record);
        if (i === recordsNotInPrereserved.length - 1) {
          resolve();
        } else {
          i += 1;
          getRecord(i);
        }
      };
      getRecord(i);
    });
    log(
      `Successfully recovered ${recordsNotInPrereserved.length} names from existing name system`
    );
  }

  log(
    `${
      Object.keys(prereservedNamesComplete).length
    } names ready to be added for deployment`
  );

  Object.keys(prereservedNamesComplete).length;
  fs.writeFileSync(
    "./names.json",
    JSON.stringify(prereservedNamesComplete, null, 2)
  );
  log("names.json has been written to the file system");

  let genesisOperations = "";
  if (Object.keys(prereservedNamesComplete).length) {
    Object.keys(prereservedNamesComplete).forEach((k, i) => {
      genesisOperations += `
  new uriCh in {
    insertArbitrary!(${prereservedNamesComplete[k]}, *uriCh) |
    for (uri <- uriCh) {
      for (current <- records) {
        records!(*current.set("${k}", *uri))
      }
    }
  } |`;
    });
    log(
      `${prereservedNames.length} prereserved names have been added to the names.rho contract`
    );

    term = term.replace("GENESIS_OPERATIONS", genesisOperations);
  } else {
    term = term.replace("GENESIS_OPERATIONS", "");
  }
  */

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
    await new Promise((resolve, reject) => {
      let over = false;
      setTimeout(() => {
        if (!over) {
          over = true;
          reject(
            "Timeout error, waited 8 seconds for GRPC response. Skipping."
          );
        }
      }, 8000);
      rchainToolkit.grpc.propose({}, grpcProposeClient).then((a) => {
        if (!over) {
          over = true;
          resolve();
          log("Proposed (1st proposal for names.rho)");
        }
      });
    });
  } catch (err) {
    log("Unable to propose, skip propose", "warning");
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
              depth: 3,
            })
            .then((dataAtNameResponse) => {
              console.log("===============");
              console.log(dataAtNameResponse);
              if (
                dataAtNameResponse &&
                JSON.parse(dataAtNameResponse).exprs.length
              ) {
                resolve(dataAtNameResponse);
                clearInterval(interval);
              } else {
                log(
                  "Did not find transaction data, will try again in 15 seconds"
                );
              }
            });
        } catch (err) {
          log("Cannot retreive transaction data, will try again in 15 seconds");
        }
      }, 15000);
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
        nameQty: 1,
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
    await new Promise((resolve, reject) => {
      let over = false;
      setTimeout(() => {
        if (!over) {
          over = true;
          reject(
            "Timeout error, waited 8 seconds for GRPC response. Skipping."
          );
        }
      }, 8000);
      rchainToolkit.grpc.propose({}, grpcProposeClient).then((a) => {
        if (!over) {
          over = true;
          resolve();
          log("Proposed (2nd proposal for nodes.rho)");
        }
      });
    });
  } catch (err) {
    log("Unable to propose, skip propose", "warning");
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
              depth: 3,
            })
            .then((dataAtNameResponse) => {
              if (
                dataAtNameResponse &&
                JSON.parse(dataAtNameResponse).exprs.length
              ) {
                resolve(dataAtNameResponse);
                clearInterval(interval);
              } else {
                log(
                  "Did not find transaction data, will try again in 15 seconds"
                );
              }
            });
        } catch (err) {
          log("Cannot retreive transaction data, will try again in 15 seconds");
        }
      }, 15000);
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
      namesDeployJsObject.registryUri.replace("rho:id:", "") +
      "\nDAPPY_NODES_UNFORGEABLE_NAME_ID=" +
      nodesDeployJsObject.nodesUnforgeableName.UnforgPrivate +
      "\nDAPPY_NODES_REGISTRY_URI=" +
      nodesDeployJsObject.registryUri.replace("rho:id:", "") +
      "\n"
  );
  process.exit();
};

main();
