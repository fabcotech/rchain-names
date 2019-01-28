const ed25519 = require("ed25519");
const keccak256 = require("js-sha3").keccak256;
const fs = require("fs");

const NAME = "mydomain";
const PUBLICKEY =
  "499819f316b7fe95d723b232ba430cf7e3b68af155eb8253905d64e1fbace058";
const PRIVATE_KEY =
  "e416638cd5a283be10a724b2b41e8f76c9e48fbbe3ccf6172bfa1293fd7ee476499819f316b7fe95d723b232ba430cf7e3b68af155eb8253905d64e1fbace058";
const REGISTRYADDRESS = "aaabbbcccdddeee";

const hash = keccak256(Buffer.from(NAME, "utf8"));
const hashBuffer = Buffer.from(hash, "hex");

// console.log("hash", hash);
// console.log("hashBuffer", hashBuffer);

const signature = ed25519.Sign(hashBuffer, Buffer.from(PRIVATE_KEY, "hex"));

const createCode = `
new stdout(\`rho:io:stdout\`) in {
  @"addrecord"!(
     {
       "name": "${NAME}",
       "publickey": "${PUBLICKEY}",
       "registryaddress": "${REGISTRYADDRESS}"
     }
  )
}
`;

const updateCode = `
new stdout(\`rho:io:stdout\`) in {
  @"addrecord"!(
     {
       "name": "${NAME}",
       "publickey": "${PUBLICKEY}",
       "registryaddress": "${REGISTRYADDRESS}",
       "signature": "${signature.toString("hex")}"
     }
  )
}
`;

fs.writeFileSync("create-name.rho", createCode, err => {
  if (err) {
    console.error(err);
  }
});

fs.writeFileSync("update-name.rho", updateCode, err => {
  if (err) {
    console.error(err);
  }
});

// console.log("signature", signature);
console.log(
  `Contracts for update and create successfully created for name ${NAME} !`
);
console.log(`create-name.rho`);
console.log(`update-name.rho`);
