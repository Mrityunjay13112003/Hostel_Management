import { Router } from "express";
import { adminLogin, adminRegister } from "../controllers/admin.controllers.js";

const adminRouter = Router();

// admin login route.
adminRouter.route("/login").post(adminLogin);

// admin register route.
adminRouter.route("/register").post(adminRegister);

export {adminRouter};