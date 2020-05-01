module.exports.updateNameTermDappy = (
  registryUri,
  nonce,
  newNonce,
  name,
  publicKey,
  serversAsString,
  address
) => {
  return {
    term: `new updateCh,
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
              "address": "${address}",
              "publicKey": "${publicKey}",
              "signature": "SIGN",
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
    }`,
    signatures: { SIGN: nonce },
  };
};
