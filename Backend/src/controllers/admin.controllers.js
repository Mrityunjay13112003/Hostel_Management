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

    // creating id and password for the first admin.
    const adminId = `${process.env.ADMIN_ID}`;
    const password = `${process.env.ADMIN_PASSWORD}`;

    // creating the document in the db.
    const admin = await Admin.create({adminId, password});

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

export {
    adminLogin
};