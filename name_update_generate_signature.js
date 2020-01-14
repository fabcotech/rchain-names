const rchainToolkit = require("rchain-toolkit");
const { blake2b } = require("blakejs");

// The public key of the record you whish to update
const PUBLIC_KEY_OF_THE_RECORD =
  "04a13198d8ac4a630273d323c8d3e0a8918799b6f574038097ebceb8efeb516ea54d210d433e7b6d2a640255de51c37a41743bf6cbd8d6240b22e72c6a25b85586";

// Your private key
const PRIVATE_KEY =
  "66c97460dc4eea37be1ea936612cb52f497b7c8864986bc276ad4b8d97c0fd3b";

const bufferToSign = Buffer.from(PUBLIC_KEY_OF_THE_RECORD, "utf8");
const uInt8Array = new Uint8Array(bufferToSign);

const blake2bHash = blake2b(uInt8Array, 0, 32);

const signature = rchainToolkit.utils.signSecp256k1(blake2bHash, PRIVATE_KEY);

const signatureHex = Buffer.from(signature).toString("hex");
console.log(
  `\Signature to update record owned by ${PUBLIC_KEY_OF_THE_RECORD.substring(
    0,
    16
  )}... is :\n\n${signatureHex}`
);
console.log(`\nSee file name_update.rho`);
