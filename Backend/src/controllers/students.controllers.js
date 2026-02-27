import { Student } from "../models/students.models.js";
import { Parent } from "../models/parents.models.js";
import { Guardian } from "../models/guardians.models.js";
import { Fee } from "../models/fees.models.js";
import {asyncHandler} from "../utils/asyncHandler.utils.js"
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import {ApiResponse} from "../utils/ApiResponse.utils.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(student_id) => {

    try
    {
        // find the document of the student for which the access and refresh token is to be generated
        const student = await Student.findById(student_id);

        // generate the access and refresh tokens for the required student document
        const accessToken = student.generateAccessToken();
        const refreshToken = student.generateRefreshToken();

        // save the refresh token into the database
        student.refreshToken = refreshToken;
        await student.save({validateBeforeSave: false}); // sirf kuchh fields ko update krne ke liye, warna error aaega for not updating the {required: true} fields.

        return {accessToken, refreshToken};
    }
    catch(error)
    {
        console.log(error.message);
        throw new ApiError(500, "Error occured while generating the access/refresh token");
    }
} 

const registerStudent = asyncHandler(async (req, res) => {

    // form data collected from req.body.
    const studentData = req.body;
    const {password, name, dateOfBirth, email, mobileNumber, address, institute, education, dateOfJoining} = studentData;
    const {parentName, parentMobileNumber, parentEmail, occupation} = studentData;
    const {guardianName, guardianMobileNumber, guardianEmail, guardianAddress} = studentData;

    //checking if all fields in form is filled or not.
    if(
        [password, name, dateOfBirth, mobileNumber, address, institute, education, dateOfJoining, parentName, parentMobileNumber, occupation, guardianName, guardianMobileNumber, guardianAddress].some(field => !field || field.toString().trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    //checking if student already exists.
    const existedStudent = await Student.findOne({mobileNumber});
    if(existedStudent)
    {
        throw new ApiError(409, "Student with the given mobile number already exists");
    }

    //uploading the image from local server to cloudinary.
    if(!req.file)
    {
        throw new ApiError(400, "Photo is required");
    }
    const photo = await uploadOnCloudinary(req.file.path);

    //creating the document for the newly registered student.
    const noOfStudents = await Student.countDocuments({isAdmitted: true}) + 1;
    const year = new Date().getFullYear();
    const studentId = `GKRP-${noOfStudents}-${year}`;
    const student = await Student.create({studentId, password, name, dateOfBirth, email, mobileNumber, address, institute, education, dateOfJoining, photo: photo.secure_url});

    //creating the document for the parent and guardian of the newly registered student.
    const parent = await Parent.create({student_id: student._id, parentName, parentMobileNumber, parentEmail, occupation});
    const guardian = await Guardian.create({student_id: student._id, guardianName, guardianMobileNumber, guardianEmail, guardianAddress});

    //creating the fee document for the newly registered student.
    const fee = await Fee.create({student_id: student._id});

    //checking if the student, parent, guardian or fee document is successfully created or not.
    const createdStudent = await Student.findOne({_id: student._id}).select(
        "-password -refreshToken"
    );
    const createdParent = await Parent.findOne({student_id: student._id});
    const createdGuardian = await Guardian.findOne({student_id: student._id});
    const createdFee = await Fee.findOne({student_id: student._id});
    if(!createdStudent || !createdParent || !createdGuardian || !createdFee)
    {
        throw new ApiError(500, "Something went wrong while registering either of the student, parent, guardian or fee models");
    }

    //return successful response
    return res
    .status(200)
    .json(new ApiResponse(200, createdStudent, "Student registered successfully"));
})

const loginStudent = asyncHandler(async(req, res) => {

    // extracting the form data from the body of the request object.
    const {studentId, password} = req.body;

    // checking if all fields are filled or not.
    if([studentId, password].some((field) => field?.trim() === ""))
    {
        throw new ApiError(400, "All fields are required");
    }

    // checking if the student is registered or not.
    const student = await Student.findOne({studentId: studentId});
    if(!student)
    {
        throw new ApiError(401, "Student is not registered");
    }

    // checking the password of the student.
    const passwordCheck = await student.checkPassword(password);
    if(!passwordCheck)
    {
        throw new ApiError(401, "Password of the required student ID is wrong");
    }

    // generating the access and refresh tokens for the registered student.
    const {accessToken, refreshToken} = generateAccessAndRefreshToken(student._id);

    // get the document of the required student from db without refresh token and password.
    const loggedInStudent = await Student.findById(student._id).select("-password -refreshToken");

    // setup the cookie options.
    const options = {
        httpOnly: true,
        secure: true
    }

    // send the final response.
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInStudent, "Student is successfully logged in"));

})

export {
    registerStudent,
    loginStudent
}