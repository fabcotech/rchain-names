// top 1000 domains
// as of
// 02/25/2020

const fs = require("fs");

const file = fs.readFileSync("./top1000domains.txt", "utf8");

let domains = {};
let string = "module.exports.prereservedNames = [\n";
file.split("\n").forEach(d => {
  const domain = d.split(".")[d.split(".").length - 2];
  if (!domains[domain]) {
    domains[domain] = true;
    string += `"${domain}",\n`;
  }
});

string += "];";

fs.writeFileSync("./top1000domains.js", Buffer.from(string, "utf8"));
