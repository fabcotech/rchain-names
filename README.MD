Contract that handles name booking/selling on the RChain platform.

The main file is `names.rho`.

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

- Delete the record : it becomes available to buy for anyone.
- Change the publickey : eventually to sell/give the name to someone else.
- Change the unforgeable name id. (although it is wiser to update the `unforgeable_name_id` data directly, rathre than update the record).
- Lock the record: the record is locked forever, it cannot be changed by anyone, neither the owner of the private key neither the issuer of the contract.

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

The prices on chain can only be expressed in REVs, their will be some kind of third party controlled variable that maintains a fair conversion rate between REVS and US dollars.

### Setup

Of course you have to have a private/public key pair, and you have to know the unforgeable name you want to associate your name to. We also consider that you have a running rnode instance.

This setup has been testes with rnode 0.9.12

```
# deploy the main names.rho contract
rnode deploy --phlo-price 1 --phlo-limit 10000 --private-key your_private_key names.rho
rnode propose

# Note the log that ressembles `rho:id:xxxxxx`, xxxxxxxx is the registry entry point
# Now edit the update.rho and create.rho files so they point to the right registry address
# replace "rho:id:yyyyyy" by "rho:id:xxxxxx" in those two files

# Create a record
rnode deploy --phlo-price 1 --phlo-limit 10000 --private-key your_private_key create.rho
rnode propose

# Update a record
rnode deploy --phlo-price 1 --phlo-limit 10000 --private-key your_private_key update.rho
rnode propose

# You just created a record and updated it so it points to another unforgeable name (bbbb)

```
