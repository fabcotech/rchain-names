const cert = `-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----`;

console.log(cert.replace(new RegExp("\n", "g"), "\\n"));
