import { readdir, readFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
var os = require("os");

export async function setSecerets() {

    var file = '/root/.microsoft/usersecrets/secrets.json'

    if (!existsSync(file)) return;

    var contents = readFileSync(file).toString();

    var json = JSON.parse(contents);

    for (const key in json) {
        if (Object.prototype.hasOwnProperty.call(json, key)) {
            const element = json[key];

            var newKey = key.split(":").join("__");

            process.env[newKey] = element

        }
    } 

    console.log("Debug secets added")
}