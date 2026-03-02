import { Router } from "express";
import { adminLogin, adminRegister, adminLogout, refreshAccessToken, setFeePlan } from "../controllers/admin.controllers.js";
import { checkAccessToken } from "../middlewares/auth.middlewares.js";

const adminRouter = Router();

// admin login route.
adminRouter.route("/login").post(adminLogin);

// admin register route.
adminRouter.route("/register").post(adminRegister);

// admin logout route.
adminRouter.route("/logout").get(checkAccessToken, adminLogout); // protected route.

// route for refreshing access token.
adminRouter.route("/refresh-access-token").post(refreshAccessToken);

// route for setting the fee plan.
adminRouter.route("/set-fee-plan").post(checkAccessToken, setFeePlan); // protected route.

export {adminRouter};