import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { registerStudent, loginStudent, logoutStudent, refreshAccessToken } from "../controllers/students.controllers.js";
import { checkAccessToken } from "../middlewares/auth.middlewares.js";

const studentRouter = Router();

// student register route.
studentRouter.route("/register").post(upload.single("profilePhoto"), registerStudent) // html form me input tag ka name "profilePhoto" hona chahiye.

// student login route.
studentRouter.route("/login").post(loginStudent);

// student logout route.
studentRouter.route("/logout").get(checkAccessToken, logoutStudent);

// route for refreshing access token.
studentRouter.route("/refresh-access-token").post(refreshAccessToken);

export {studentRouter};