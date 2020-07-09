Rholang code for managing names records and nodes on a decentralized Dappy network.

The `names.rho` file is a DNS-like record. Anyone can buy name, and link it to an unforgeable name, under the Dappy system, this unforgeable name must point to a file that has been uploaded to the blockchain. See [dappy-cli](https://github.com/fabcotech/dappy-cli).

The `nodes.rho` file is the record on chain that stores all the nodes responsible for a decentralized Dappy network. Right now it is the deployer of the smart-contract that has the right to add or remove network members. Eventually it will be a vote based mechanisme later.

This setup has been testes with rnode 0.9.19. We consider that you can connect to a running rnode instance, and have private/public key pair for deployment.

### Setup (Dappy network contracts : names.rho + nodes.rho)

The simplest way is to use the node JS script that will deploy `names.rho` + `nodes.rho`.

Copy the `.env.example` file to `.env`, eventually replace with correct port/host values.

Execute script :

**Careful** : There is a 300 000 phlo limit hardcoded, provide the --phlo-limit CLI parameter to override it

#### Pre-reserved names

By default, the top 1000 domain names will be pre-reserved, check the `top1000domains\*` files. The public key used for deployment will be the owner of all those names. You must set the `ADDRESS_FOR_PRERESERVED_NAMES` in `.env` file to a file/address that exists (previously deployed with dappy-cli for example), usually, this file/address explains why the name has been pre-reserved and how to recover it if you are the legitimate owner.

The `prereserved_name_dapp.dpy` file is the file deployed at each Dappy network releases.

![Prereserved names](https://i.ibb.co/6P40sjy/prereserved-name.png)

You can avoid this feature by overriding `top1000domains.js` with the following :

```
module.exports.prereservedNames = null;
```

#### Deployment

```
npm i
node init_dappy_network.js --private-key PRIVATE_KEY
```

Now that you have deployed the two init files, anyone is able to add a name, and you only is able to add/remove a dappy node. Simply check the `name_create.rho`,`name_update.rho`, `node_add.rho`, `node_remove.rho`, replace with the correct URI value (output from the preceding script).

### Setup (only names.rho)

You can directly deploy the `names.rho` contract with rnode cli, if you deploy it directly you must retreive the registry URI that is logged by rnode.

**Important :** Check the price you want to impose for each purchase, `priceCh` (line 24).

Make sure to change the following expressions :

- `GENESIS_OPERATIONS` remove in rholang (line 32).
- `NONCE` in rholang (line 27) with appropriate value.
- `PUBLIC_KEY` in rholang (line 28) with appropriate value.
- `ADDRESS` in rholang (line 29) with appropriate value.

### Create/purchase name

#### With node JS

```
# Update the name.json file so it describes your name
# You can look at name.json.dapp.example and name.json.ipapp.example files

node purchase.js --private-key PRIVATE_KEY --registry-uri-entry ccc
```

#### With rnode CLI

```
# Generate a random nonce
node generateNonce.js

# Update the nonce and other record values in name_create.rho
# Update the registry URI value in name_create.rho

# Deploy name_create.rho

# "purchase succesfull" should be logged

```

### Javascript library

If you look at the `src` folder, there are utils available for javascript programs. Those functions simply return the term needed for create term or update term operations. You can add the following to your `package.json` to use it.

```
  ...
  "rchain-names": "fabcotech/rchain-names",
  ...
```

### Update name

```
# Generate a random nonce
node generateNonce.js

# Generate a signature by referencing the private key and nonce in generateSignatureForNonce.js
node generateSignatureForNonce.js

# Update the nonce, signature and other record values in name_update.rho

# Update the registry URI value in name_update.rho (same as in name_create.rho)

# Deploy name_update.rho

# "update succesfull" should be logged
```

### How a name is represented onchain

The values stored in this contract are an array of Records.

A Record is an rholang Map containing the following keys:

- `name` (string): from 1 to 32 characters that only contains lowcase latin characters (no accent) and numbers from 0 to 9. Also it must start with a letter.
- `publicKey` (string): secp256k1 (native algo for rchain) public key of the owner of the name, it must match the public key of the deployer.
- `address` (string): optional key that indicate an address. On the RChain platform, the address must be construced following the files-module paradigm (**registry_uri.file_id**). See https://github.com/fabcotech/rholang-files-module .
- `locked` (boolean): wether or not this record is frozen forever and will never be updated/deleted. Only available for 16 or more characters long names.

There are approximately 6E46 possible names to own, about E37 (10 with 37 zeros behind) for every currently living human.

### What an owner can do with his/her name

The owner of a Record (the person/organization who possesses the private key that corresponds with the public key) can:

- Delete the record (not implemented): it becomes available to buy for anyone.
- Change the publickey: eventually to sell/give the name to someone else.
- Change the unforgeable name id. (although it is wiser to update the `unforgeable_name_id` data directly, rathre than update the record).
- Lock the record (not implemented): the record is locked forever, it cannot be changed by anyone, neither the owner of the private key neither the issuer of the contract.

### Expiration policy

Just like for domain names with the internet, an expiration system should exist so one cannot book some cool domains forever without paying for it.

- Some applications require a name to be persistent/eternal, this feature will be propose for names that are 16 characters long or more, a market will exist for less long names (the majority of them), and so they cannot be booked forever and for just few REVS or dollars.
- Other names should have a quite long expiration period (2 years, 3 years ?) so it is not as stressfull to deal with as domain names currently.

### Pricing policy

So all cool domains are not bought in one minute a pricing policy must exist. A simple/obvious policy is to price names depending on their size.

A proposition:

- 1000\$ for 1 character long names.
- 500\$ for 2 characters long names.
- 100\$ for 3 characters long names.
- 20\$ for 4/5 characters long names.
- 10\$ for 6-7 characters long names.
- 2\$ for 8-12 characters long names.
- 1\$ for 12-32 characters long names.

- 1\$ to lock a record (that has 16 characters or more).

#### Where should these REVS go ?

This contract has been primarly written to work with a Dappy network. The purchase of the names is a key part of the Dappy ecosystem, therefore under Dappy rules, REVs that come from name purchases will be equally divided between the members of the Dappy network. This creates an economic incentive for Dappy network members to follow the protocol and maintain strong infrastructure.

Nevertheless you are free to deploy this records contract and use it the way you want.

#### Prevent "yahoo" or "mozilla" from being bought by random persons

**See Pre-reserved names paragraph**

The top 100, top 1000 etc... domain must be reserved. Check https://umbrella.cisco.com/blog/cisco-umbrella-1-million

#### Handle dollar/REVS rate fluctuations

You are free to express price in raw REVs. Under a Dappy network, we need to have a mapping to some major fiat currency rate (dollar or euro) so the price is generally stable from an outside point of view.

The prices on chain can only be expressed in REVs, their will be some kind of third party controlled variable that maintains a fair conversion rate between REVS and US dollars

#### Testnet .env config

READ_ONLY_HOST=https://observer.testnet.rchain.coop
READ_ONLY_HTTP_PORT=443
VALIDATOR_HOST=https://node2.testnet.rchain-dev.tk
VALIDATOR_GRPC_PROPOSE_PORT=40402
VALIDATOR_HTTP_PORT=443

#### Mainnet .env config

READ_ONLY_HOST=https://observer-asia.services.mainnet.rchain.coop
READ_ONLY_HTTP_PORT=443
VALIDATOR_HOST=https://node3.root-shard.mainnet.rchain.coop
VALIDATOR_GRPC_PROPOSE_PORT=40401
VALIDATOR_HTTP_PORT=443
