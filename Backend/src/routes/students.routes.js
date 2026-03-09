import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    registerStudent,
    loginStudent,
    logoutStudent,
    refreshAccessToken,
    changeStudentPassword,
    viewProfile,
    generateOtp,
    verifyOtp
} from "../controllers/students.controllers.js";
import { checkAccessToken } from "../middlewares/auth.middlewares.js";

const studentRouter = Router();

// student register route.
studentRouter.route("/register").post(upload.single("profilePhoto"), registerStudent); // html form me input tag ka name "profilePhoto" hona chahiye.

// student login route.
studentRouter.route("/login").post(loginStudent);

// student logout route.
studentRouter.route("/logout").get(checkAccessToken, logoutStudent); // protected route.

// route for refreshing access token.
studentRouter.route("/refresh-access-token").post(refreshAccessToken);

// route for changing student password.
studentRouter.route("/change-password").put(changeStudentPassword); // validation via OTP.

// route for viewing the student profile.
studentRouter.route("/profile").get(checkAccessToken,viewProfile); // protected route.

// route for generating otp.
studentRouter.route("/generate-otp").post(generateOtp);

// route for resending otp.
studentRouter.route("/resend-otp").post(generateOtp);

// route for verifying the otp.
studentRouter.route("/verify-otp").post(verifyOtp);

export {studentRouter};