module.exports.updateNameTerm = (
  registryUri,
  newNonce,
  name,
  publicKey,
  serversAsString,
  signature
) => {
  return `new updateCh,
  returnCh,
  lookup(\`rho:registry:lookup\`),
  stdout(\`rho:io:stdout\`) in {

  lookup!(\`rho:id:${registryUri}\`, *updateCh) |

  for(update <- updateCh) {
    update!((
      {
        "type": "UPDATE",
        "payload": {
          "name": "${name}",
          "servers": ${serversAsString},
          "publicKey": "${publicKey}",
          "signature": "${signature}",
          "nonce": "${newNonce}",
        }
      },
      *returnCh
    )) |
    for (@res <- returnCh) {
      match res {
        true => {
          stdout!("update succesfull")
        }
        _ => {
          stdout!(res)
        }
      }
    }
  }
}`;
};
