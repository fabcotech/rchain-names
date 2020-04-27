module.exports.createNameTerm = (
  registryUri,
  newNonce,
  publicKey,
  serversAsString,
  address,
  price
) => {
  return `new 
  revAddress(\`rho:rev:address\`),
  registryLookup(\`rho:registry:lookup\`),
  stdout(\`rho:io:stdout\`),
  publicKeyCh,
  entryCh,
  returnCh
in {

  publicKeyCh!!("${publicKey}") |

  registryLookup!(\`rho:id:${registryUri}\`, *entryCh) |
  
  for(entry <- entryCh; @publicKey <- publicKeyCh) {
    entry!((
      {
        "type": "CREATE",
        "payload": {
          "name": "${name}",
          "publicKey": publicKey,
          "servers": ${serversAsString},
          "address": "${address}",
          "nonce": "${newNonce}",
        }
      },
      *returnCh
    )) |

    for (@res <- returnCh; @publicKey <- publicKeyCh) {
      stdout!(res) |
      match res.nth(0) {
        payload => {
          match payload {
            {
              "price": Int,
              "purseRevAddr": String
            } => {
              stdout!(("contract asked for payment of ", payload.get("price"), "to", payload.get("purseRevAddr"))) |
              
              new revVaultCh, deployerRevAddressCh in {

                registryLookup!(\`rho:rchain:revVault\`, *revVaultCh) |
                revAddress!("fromPublicKey", publicKey.hexToBytes(), *deployerRevAddressCh) |

                for (@(_, RevVault) <- revVaultCh; @deployerRevAddress <- deployerRevAddressCh) {

                  new deployerVaultCh, deployerVaultkeyCh, deployerId(\`rho:rchain:deployerId\`) in {
                    @RevVault!("findOrCreate", deployerRevAddress, *deployerVaultCh) |
                    @RevVault!("deployerAuthKey", *deployerId, *deployerVaultkeyCh) |
                    for (@(true, vault) <- deployerVaultCh; key <- deployerVaultkeyCh) {

                      stdout!(("Beginning transfer of ", ${price}, "from", deployerRevAddress, "to purse", payload.get("purseRevAddr"))) |
                      new resultCh in {
                        @vault!("transfer", payload.get("purseRevAddr"), ${price}, *key, *resultCh) |
                        for (@result <- resultCh) {
                          stdout!(("Finished transfer of ", ${price}, "to", payload.get("purseRevAddr"), "result was:", result)) |
                          match result {
                            (true, Nil) => {
                              match res.nth(1) {
                                a => {
                                  new returnCh2 in {
                                    @a!((true, *returnCh2)) |
                                    for (@res2 <- returnCh2) {
                                      match res2 {
                                        true => {
                                          stdout!("purchase successful")
                                        }
                                        _ => {
                                          stdout!(res2)
                                        }
                                      }
                                    }
                                  }
                                }
                              }
      
                            }
                            _ => {
                              stdout!("error in transfer") |
                              stdout!(result)
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            a => {
              stdout!(a)
            }
          }
        }
      }
    }
  }
}`;
};
