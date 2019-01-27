Contract that handles name booking/selling on the RChain platform.

### How a name is represented onchain

The values stored in this contract are an array of Records.

A Record is an rholang Map containing the following keys:

- `name` (string): from 1 to 32 characters that only contains lowcase latin characters (no accent) and numbers from 0 to 9. Also it must start with a letter.
- `publickey` (string): ED25519 (native algo for rchain) public key of the owner of the name, if not provided it will be the public key of the issuer of the transaction.
- `registryaddress` (string): optional key that indicate a registry address some applications (Dappy for example) might look at to load some stuff. This allows to directly link some data to a given name and a given public key.
- `locked` (boolean): wether or not this record is frozen forever and will never be updated/deleted. Only available for 16 or more characters long names.

There are approximately 6E46 possible names to own, about E37 (10 with 37 zeros behind) for every currently living human.

### What an owner can do with his/her name

The owner of a Record (the person/organization who possesses the private key that corresponds with the public key) can:

- Delete the record : it becomes available to buy for anyone.
- Change the publickey : eventually to sell/give the name to someone else.
- Lock the record: the record is locked forever, it cannot be changed by anyone, neither the owner of the private key neither the issuer of the contract.
- Remove or edit the registry address.

### Expiration policy

Just like for domain names with the internet, an expiration system should exist so I cannot book some cool domains forever without paying for it.

- Some applications require a name to be persistent/eternal, this feature will be propose for names that are 16 characters long or more, a market can exist for less long names (the majority of them), and so they cannot be booked forever and for just few REVS or dollars.
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

- 1\$ to lock a record.

#### Where should these REVS go ?

Good question, should they be burned ? should they be controlled by an independant organization ?

#### Prevent "yahoo" or "mozilla" from being bought by random persons

It could be a cool idea to forbid anyone from buying one of the 10 000 more frequented websites in the world. All these names could be at genesis owned by a honest third party who's only purpose is to identify the legitimate requests from big corporations or governements for a given name. When rightly identified, the third party would just edit the public key of the record so its owner changes.

#### Handle dollar/REVS rate fluctuations

Since the prices will be expressed in REVS, their will be some kind of third party controlled variable that maintains a fair conversion rate between REVS and US dollars.

Every idea/proposition is welcome
