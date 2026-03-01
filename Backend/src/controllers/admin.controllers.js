import { Admin } from "../models/admin.models.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(admin_id) => {

    try
    {
        // find the document of the admin for which the access and refresh token is to be generated
        const admin = await Admin.findById(admin_id);

        // generate the access and refresh tokens for the required admin document
        const accessToken = admin.generateAccessToken();
        const refreshToken = admin.generateRefreshToken();

        // save the refresh token into the database
        admin.refreshToken = refreshToken;
        await admin.save({validateBeforeSave: false}); // sirf kuchh fields ko update krne ke liye, warna error aaega for not updating the {required: true} fields.

        return {accessToken, refreshToken};
    }
    catch(error)
    {
        console.log(error.message);
        throw new ApiError(500, "Error occured while generating the access/refresh token");
    }
}

const seedAdmin = async() => {

    try
    {
        // creating id and password for the first admin.
        const adminId = `${process.env.ADMIN_ID}`;
        const password = `${process.env.ADMIN_PASSWORD}`;

        // creating the document in the db.
        const admin = await Admin.create({adminId, password});
    }
    catch(error)
    {
        throw new ApiError(500, error.message);
    }

}

const adminLogin = asyncHandler(async(req, res) => {

    // checking if the first admin is seeded or not and seeding it if it is not.
    const noOfAdmins = await Admin.countDocuments();
    if(!noOfAdmins)
    {
        await seedAdmin();
    }

    // destructuring the form data from the body of the request object.
    const {adminId, password} = req.body;

    // checking if all entries were filled.
    if(!adminId || !password)
    {
        throw new ApiError(400, "All the fields are required");
    }

    // checking if the admin is registered or not.
    const admin = await Admin.findOne({adminId: adminId});
    if(!admin)
    {
        throw new ApiError(401, "Admin is not registered");
    }

    // checking if the password entered is correct or not.
    const isPasswordCorrect = await admin.checkPassword(password);
    if(!isPasswordCorrect)
    {
        throw new ApiError(401, "Wrong password entered");
    }

    // generate the access and refresh tokens and save the refresh token in the db.
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(admin._id);

    // finding the logged in admin without its refresh token and password.
    const loggedInAdmin = await Admin.findById(admin._id).select("-password -refreshToken");

    // setting the options for saving the access and refresh tokens in the browser of the admin.
    const options = {
        httpOnly: true,
        secure: false  // production ke time ise true kr dena.
    }

    // sending the final response.
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInAdmin, "Admin is successfully logged in"));
})

const adminRegister = asyncHandler(async(req, res) => {

    // destructuring the password from the body of the request object.
    const {password} = req.body;

    // checking if field is filled or not.
    if(password.trim() === "")
    {
        throw new ApiError(400, "All fields are required");
    }

    // creating the admin id and a  new document for the newly registered admin.
    const noOfAdmins = await Admin.countDocuments();
    const adminId = `ADMN-${noOfAdmins+1}`;
    const registeredAdmin = await Admin.create({adminId, password});

    // checking if the new admin document is created or not.
    const createdAdmin = await Admin.find({adminId}).select("-password -refreshToken");
    if(!createdAdmin)
    {
        throw new ApiError(500, "Admin not registered.");
    }

    // returning the final successful response.
    return res
    .status(200)
    .json(new ApiResponse(200, createdAdmin, "Admin registered successfully."));
})

const adminLogout = asyncHandler(async(req, res) => {

    // removing the refresh token from the required admin document.
    const adminDocument = await Admin.findById(req.user._id);
    adminDocument.refreshToken = undefined;

    // saving the new admin document in the db.
    adminDocument.save({validateBeforeSave: false});

    // setting up the options for clearing the cookies.
    const options = { // should be same as login
        httpOnly: true,
        secure: false
    }

    // returning the final response with deleted access and refresh token cookies.
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Admin logged out successfully."));
})

const refreshAccessToken = asyncHandler(async(req, res) => {

    // extracting the refresh token from the cookie or from the body of the request object.
    const givenRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // checking if the refresh token is given or not.
    if(!givenRefreshToken)
    {
        throw new ApiError(401, "Unauthorized access");
    }

    // decoding the refresh token and checking if an admin exist having the given refresh token exists or not.
    try
    {
        const decodedToken = jwt.verify(givenRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        // checking if an admin exist with the given refresh token.
        const admin = await Admin.findById(decodedToken._id);
        if(!admin)
        {
            throw new ApiError(401, "Invalid refresh token");
        }

        // checking if the refresh token is used out or not.
        if(givenRefreshToken !== admin?.refreshToken)
        {
            throw new ApiError(401, "Refresh token expired or used");
        }

        // generating the access token and the refresh token and storing the refresh token in the db.
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(admin._id);

        // options for setting the tokens in the cookies.
        const options = {
            httpOnly: true,
            secure: false // production ke time true hoga ye and development ke time false.
        }

        // sending final response with the tokens.
        res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {accessToken, refreshToken}, "Access token successfully refreshed"));
    }
    catch(error)
    {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})

export {
    adminLogin,
    adminRegister,
    adminLogout,
    refreshAccessToken
};