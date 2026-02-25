import express from "express";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

//importing the routers
import { studentRouter } from "./routes/students.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

app.use("/api/v1/students", studentRouter);
app.use("/api/v1/admins", adminRouter);

export {app};