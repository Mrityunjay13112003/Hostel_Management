import { Router } from "express";
import { adminLogin } from "../controllers/admin.controllers.js";

const adminRouter = Router();

// admin login route.
adminRouter.route("/login").post(adminLogin);

export {adminRouter};