import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { registerStudent, loginStudent } from "../controllers/students.controllers.js";

const studentRouter = Router();

// student register route.
studentRouter.route("/register").post(upload.single("profilePhoto"), registerStudent) // html form me input tag ka name "profilePhoto" hona chahiye.

// student login route.
studentRouter.route("/login").post(loginStudent);

export {studentRouter};