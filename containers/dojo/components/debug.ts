import { readdir, readFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
var os = require("os");

export async function setSecerets() {

    var file = '/root/.microsoft/usersecrets/secrets.json'

    if (!existsSync(file)) return;

    var contents = cleanString(readFileSync(file).toString());

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

function cleanString(input: string) {
    var output = "";
    for (var i=0; i<input.length; i++) {
        if (input.charCodeAt(i) <= 127) {
            output += input.charAt(i);
        }
    }
    return output;
}