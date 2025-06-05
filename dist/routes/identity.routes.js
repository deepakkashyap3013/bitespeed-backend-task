"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const indentity_controller_1 = require("../controllers/indentity.controller");
const router = (0, express_1.Router)();
router.post('/identify', indentity_controller_1.identifyContact);
exports.default = router;
