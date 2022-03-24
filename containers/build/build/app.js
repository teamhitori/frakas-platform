"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const CompilerService_1 = require("./components/CompilerService");
const debug_1 = require("./components/debug");
var go = async () => {
    await (0, debug_1.setSecerets)();
    const port = process.env.port || 80;
    const app = (0, express_1.default)();
    app.listen(port);
    console.log(`Opening Express on port ${port}`);
    new CompilerService_1.CompilerService(app);
};
go();
//# sourceMappingURL=app.js.map