import { Router } from "express";
import { 
    adminLogin, 
    adminRegister, 
    adminLogout, 
    refreshAccessToken, 
    setFeePlan, 
    inquiryAddition, 
    adminDashboard, 
    getStudent,
    leaveStudentOrInquiry
} from "../controllers/admin.controllers.js";
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

// route for adding an inquiry.
adminRouter.route("/inquiry-addition").post(checkAccessToken, inquiryAddition); // protected route.

// admin dashboard route.
adminRouter.route("/dashboard").get(checkAccessToken, adminDashboard); // protected route.

// route for getting details of a particular student.
adminRouter.route("/get-student-data/:_id").get(checkAccessToken, getStudent); // protected route.

// route for deleting the student who left or the inquiry who left.
adminRouter.route("/remove-student/:_id").patch(checkAccessToken, leaveStudentOrInquiry); // protected route.

export {adminRouter};