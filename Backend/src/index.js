import {app} from "./app.js";
import dotenv from "dotenv";
import { connectDB } from "./db/connectDB.db.js";


dotenv.config({
    path: './.env'
});

connectDB()
.then(() => {
    console.log("Connection established with Database");
    app.listen(process.env.PORT, () => {
        console.log("Server is running");
    })
})
.catch((err) => {
    console.log("MongoDB connection failed", err);
})