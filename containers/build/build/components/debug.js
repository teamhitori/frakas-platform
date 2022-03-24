"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSecerets = void 0;
const fs_1 = require("fs");
var os = require("os");
async function setSecerets() {
    var file = '/root/.microsoft/usersecrets/secrets.json';
    if (!(0, fs_1.existsSync)(file))
        return;
    var contents = (0, fs_1.readFileSync)(file).toString();
    var json = JSON.parse(contents);
    for (const key in json) {
        if (Object.prototype.hasOwnProperty.call(json, key)) {
            const element = json[key];
            var newKey = key.split(":").join("__");
            process.env[newKey] = element;
        }
    }
    console.log("Debug secets added");
}
exports.setSecerets = setSecerets;
//# sourceMappingURL=debug.js.map