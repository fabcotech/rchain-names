Rholang code for managing names records and nodes on a decentralized Dappy network.

The `names.rho` file is a DNS-like record. Anyone can buy name, and link it to an unforgeable name, under the Dappy system, this unforgeable name must point to a file that has been uploaded to the blockchain. See [dappy-cli](https://github.com/fabcotech/dappy-cli).

The `nodes.rho` file is the record on chain that stores all the nodes responsible for a decentralized Dappy network. Right now it is the deployer of the smart-contract that has the right to add or remove network members. Eventually it will be a vote based mechanisme later.

This setup has been testes with rnode 0.9.19. We consider that you can connect to a running rnode instance, and have private/public key pair for deployment.

### Setup (Dappy network contracts : names.rho + nodes.rho)

The simplest way is to use the node JS script that will deploy `names.rho` + `nodes.rho`.

Copy the `.env.example` file to `.env`, eventually replace with correct port/host values.

Execute script :

**Careful** : There is a 30 000 phlo limit hardcoded

```
npm i
node init_dappy_network.js --private-key PRIVATE_KEY --public-key PUBLIC_KEY
```

Now that you have deployed the two init files, anyone is able to add a name, and you only is able to add/remove a dappy node. Simply check the `name_create.rho`,`name_update.rho`, `node_add.rho`, `node_remove.rho`, replace with the correct URI value (output from the preceding script).

### Setup (only names.rho)

You can directly deploy the `names.rho` contract with rnode cli, if you deploy it directly you must retreive the registry URI that is logged by rnode.

### Create name

```
# Generate a random nonce
node generate_nonce.js

# Update the nonce and other record values in name_create.rho
# Update the registry URI value in name_create.rho

# Deploy name_create.rho

# "purchase succesfull" should be logged
```

### Update name

```
# Generate a random nonce
node generate_nonce.js

# Generate a signature by referencing the private key and nonce in name_update_generate_signature.js
node name_update_generate_signature.js

# Update the nonce, signature and other record values in name_update.rho

# Update the registry URI value in name_update.rho (same as in name_create.rho)

# Deploy name_update.rho

# "update succesfull" should be logged
```

### How a name is represented onchain

The values stored in this contract are an array of Records.

A Record is an rholang Map containing the following keys:

- `name` (string): from 1 to 32 characters that only contains lowcase latin characters (no accent) and numbers from 0 to 9. Also it must start with a letter.
- `public_key` (string): secp256k1 (native algo for rchain) public key of the owner of the name, it must match the public key of the deployer.
- `unforgeable_name` (string): optional key that indicate an unforgeable name id. On the RChain platform, the unforgeable name id is a unique ID that can point to any kind of data.
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

It could be a cool idea to forbid anyone from buying one of the 10 000 more frequented websites in the world. All these names could be at genesis owned by a honest third party who's only purpose is to identify the legitimate requests from big corporations or governements for a given name. When rightly identified, the third party would just edit the public key of the record so its owner changes.

#### Handle dollar/REVS rate fluctuations

You are free to express price in raw REVs. Under a Dappy network, we need to have a mapping to some major fiat currency rate (dollar or euro) so the price is generally stable from an outside point of view.

The prices on chain can only be expressed in REVs, their will be some kind of third party controlled variable that maintains a fair conversion rate between REVS and US dollars
