import { Router } from "express";
import { adminLogin, adminRegister, adminLogout } from "../controllers/admin.controllers.js";
import { checkAccessToken } from "../middlewares/auth.middlewares.js";

const adminRouter = Router();

// admin login route.
adminRouter.route("/login").post(adminLogin);

// admin register route.
adminRouter.route("/register").post(adminRegister);

// admin logout route.
adminRouter.route("/logout").get(checkAccessToken, adminLogout);

export {adminRouter};