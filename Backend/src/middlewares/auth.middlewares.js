import { Admin } from "../models/admin.models.js";
import { Student } from "../models/students.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js"
import jwt, { decode } from "jsonwebtoken";

// middleware for checking the access token.
const checkAccessToken = asyncHandler(async(req, _, next) => {

    // take the token form req.cookies or from authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", ""); // for web apps => cookies, and for manual setup or mobile app => authorization header.

    // check if access token is recieved and its not expired.
    if(!token)
    {
        throw new ApiError(401, "Unauthorized request");
    }

    // verify the access token and add it into request object.
    try
    {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // find the corresponding student/admin document.
        let document;
        if(decodedToken.studentId)
        {
            document = await Student.findOne({studentId: decodedToken.studentId}).select("-password -refreshToken");
        }
        else if(decodedToken.adminId)
        {
            document = await Admin.findOne({adminId: decodedToken.adminId}).select("-password -refreshToken");
        }
        else
        {
            throw new ApiError(401, "Invalid token payload");
        }

        // check if the document exists.
        if(!document)
        {
            throw new ApiError(401, "Student/Admin not found");
        }

        req.user = document;

        next();
    }
    catch(error)
    {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
})