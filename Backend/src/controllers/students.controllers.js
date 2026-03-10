import { Student } from "../models/students.models.js";
import { Parent } from "../models/parents.models.js";
import { Guardian } from "../models/guardians.models.js";
import { Fee } from "../models/fees.models.js";
import {asyncHandler} from "../utils/asyncHandler.utils.js"
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import {ApiResponse} from "../utils/ApiResponse.utils.js"
import { Otp } from "../models/otp.models.js";
import { sendEmail } from "../utils/email.utils.js";
import {randomInt} from "crypto";
import jwt from "jsonwebtoken";
import { log } from "console";

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

    //checking if student already exists and checking whether its a valid inquiry or not.
    const existedInquiry = await Student.findOne({mobileNumber});
    console.log("Request mobileNumber:", mobileNumber);
    console.log("Fetched inquiry:", existedInquiry);
    if(!existedInquiry)
    {
        throw new ApiError(400, "Inquiry not registered. Student cannot be registered.");
    }
    if(existedInquiry.isAdmitted)
    {
        throw new ApiError(409, "Student is already registered.");
    }

    //uploading the image from local server to cloudinary.
    if(!req.file)
    {
        throw new ApiError(400, "Photo is required");
    }
    const photo = await uploadOnCloudinary(req.file.path);
    if(!photo)
    {
        throw new ApiError(500, "Photo upload failed");
    }

    //updating the document of the inquiry into the document of a registered student.
    const noOfStudents = (await Student.countDocuments({isAdmitted: true})) + 1;
    const year = new Date().getFullYear();
    const studentId = `GKRP-${noOfStudents}-${year}`;
    Object.assign(existedInquiry, {studentId, password, name, dateOfBirth, email, mobileNumber, address, institute, education, dateOfJoining, photo: photo.secure_url, isAdmitted: true});
    await existedInquiry.save({validateBeforeSave: false});

    // removing the remark field from the student document.
    await Student.updateOne(
        {mobileNumber},
        {
            $unset: {remark: ""}
        }
    );

    //creating the document for the parent, guardian and fee of the newly registered student.
    await Promise.all([
        Parent.create({student_id: existedInquiry._id, parentName, parentMobileNumber, parentEmail, occupation}),
        Guardian.create({student_id: existedInquiry._id, guardianName, guardianMobileNumber, guardianEmail, guardianAddress}),
        Fee.create({student_id: existedInquiry._id})
    ])

    //checking if the inquiry is updated and parent, guardian or fee document is successfully created or not.
    const updatedDetails = await Promise.all([
        Student.findById(existedInquiry._id).select("-password -refreshToken"),
        Parent.findOne({student_id: existedInquiry._id}),
        Guardian.findOne({student_id: existedInquiry._id}),
        Fee.findOne({student_id: existedInquiry._id})
    ])
    const [studentDoc, parentDoc, guardianDoc, feeDoc] = updatedDetails;
    if(!studentDoc || !parentDoc || !guardianDoc || !feeDoc)
    {
        throw new ApiError(500, "Something went wrong while registering either of the student, parent, guardian or fee models");
    }

    // successfully send the confirmation email for successful student registration if the student has the email address.
    if(existedInquiry.email)
    {
        const to = existedInquiry.email;
        const subject = "Confirmation for successful registration.";
        const text = `Dear Student,
        Congratulations! Your registration for the hostel has been successfully completed.
        Your details have been recorded in our system, and you can now access hostel services using your student ID.
        Student ID: ${studentId}
        Name: ${name}
        Date of Joining: ${dateOfJoining}
        Please keep your Student ID safe, as it will be required for future hostel-related activities.
        If you have any questions or need assistance, feel free to contact the hostel administration.

        Best regards,
        Hostel Administration
        Gurukripa Boys' Hostel.`;
        const info = await sendEmail(to, subject, text);
        if(!info || info.accepted.length === 0)
        {
            throw new ApiError(500, "Email could not be sent.");
        }
        console.log(info);
    }

    //return successful response
    return res
    .status(201)
    .json(new ApiResponse(201, {}, "Student registered successfully"));
})

const loginStudent = asyncHandler(async(req, res) => {

    // extracting the form data from the body of the request object.
    const {studentId, password} = req.body;

    // checking if all fields are filled or not.
    if (
        typeof studentId !== "string" ||
        typeof password !== "string" ||
        !studentId.trim() ||
        !password.trim()
    )
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

    // checking if the student has left the hostel or not.
    if(student.hasLeft)
    {
        throw new ApiError(401, "Student has left the hostel.");
    }

    // checking whether the student is admitted or is just an inquiry.
    if(!student.isAdmitted)
    {
        throw new ApiError(401, "Student is not admitted and is just an inquiry.");
    }

    // generating the access and refresh tokens for the registered student.
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(student._id);

    // get the document of the required student from db without refresh token and password.
    const loggedInStudent = await Student.findById(student._id).select("-password -refreshToken");

    // setup the cookie options.
    const options = {
        httpOnly: true,
        secure: false // production ke time ise true kr dena.
    }

    // send the final response.
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInStudent, "Student is successfully logged in"));

})

const logoutStudent = asyncHandler(async(req, res) => {
    
    // extracting the student document whose refresh token has to be deleted.
    const student = await Student.findById(req.user._id);

    // saving the document of the student with deleted refresh token.
    student.refreshToken = undefined;
    await student.save({validateBeforeSave: false});

    // setting up the options for clearing the cookies.
    const options = { // should be same as login
        httpOnly: true,
        secure: false
    }

    // returning the final response with clearing the access and refresh token cookies.
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Student successfully logged out."));
})

const refreshAccessToken = asyncHandler(async(req, res) => {

    // extracting the refresh token from the cookie or from the body of the request object.
    const givenRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // checking if the refresh token is given or not.
    if(!givenRefreshToken)
    {
        throw new ApiError(401, "Unauthorized access");
    }

    // decoding the refresh token and checking if a student exist having the given refresh token exists or not.
    try
    {
        const decodedToken = jwt.verify(givenRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        // checking if a student exist with the given refresh token.
        const student = await Student.findById(decodedToken._id);
        if(!student)
        {
            throw new ApiError(401, "Invalid refresh token");
        }

        // checking if the refresh token is used out or not.
        if(givenRefreshToken !== student?.refreshToken)
        {
            throw new ApiError(401, "Refresh token expired or used");
        }

        // generating the access token and the refresh token and storing the refresh token in the db.
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(student._id);

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

const changeStudentPassword = asyncHandler(async(req, res) => {  

    // destructuring the email, password and confirmation password from the body of the request object.
    const {email, password, confirmPassword} = req.body;

    // checking if all the fields are filled.
    if([email, password, confirmPassword].some(field => !field || field.trim() === ""))
    {
        throw new ApiError(400, "All fields are required.");
    }

    // checking if the password is equal to confirmPassword.
    if(!(password === confirmPassword))
    {
        throw new ApiError(400, "Confirm your password.");
    }

    // extracting the otp document of the required email and checking if the otp is verified and deleting it.
    const otp = await Otp.findOne({email});
    if(!otp)
    {
        throw new ApiError(404, "Otp is not generated.");
    }
    if(!otp.hasVerified)
    {
        throw new ApiError(401, "Otp is not verified.");
    }
    const deletedOtp = await Otp.deleteOne({email});
    if(deletedOtp.deletedCount === 0)
    {
        throw new ApiError(500, "Otp document could not be deleted.");
    }

    // storing the given new password in the database.
    const student = await Student.findOne({email});
    if(!student)
    {
        throw new ApiError(404, "No such student exists with given email");
    }
    student.password = password;
    await student.save({validateBeforeSave: false});
    const updatedStudent = await Student.findOne({email}).select("-password -refreshToken");

    // checking if the updated password is saved or not.
    if(!updatedStudent)
    {
        throw new ApiError(500, "Updated document could could not be fetched.");
    }

    // returning the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, updatedStudent, "Password successfully updated."));
})

const viewProfile = asyncHandler(async(req, res) => {

    // extracting the _id of the required student from the body of the request object.
    const id = req.user._id;
    
    // getting the student data from the db using the _id in the user object in request object.
    const studentData = await Student.findById(id).select("-password -refreshToken").lean();

    // checking if the details of the student is recieved or not.
    if(!studentData)
    {
        throw new ApiError(404, "No such student exists whose _id matches with the given _id");
    }

    // getting the details of the parent, guardian and fee for the required student if the student is admitted.
    if(studentData.isAdmitted)
    {
        const [parent, guardian, fee] = await Promise.all([
            Parent.findOne({student_id: id}).select("-refreshToken -password").lean(),
            Guardian.findOne({student_id: id}).select("-refreshToken -password").lean(),
            Fee.findOne({student_id: id}).select("-refreshToken -password").lean()
        ]);

        studentData.parent = parent;
        studentData.guardian = guardian;
        studentData.fee = fee;
    }

    // returning the final response with the desired data.
    return res
    .status(200)
    .json(new ApiResponse(200, studentData, "Student profile is successfully returned"));
})

const generateOtp = asyncHandler(async(req, res) => {

    // destructuring the email address from the body of the request object.
    const {email} = req.body;

    // checking if the email field is filled.
    if(!email || email.trim() === "")
    {
        throw new ApiError(400, "Email is required.");
    }
    // checking if the email is of a student.
    const student = await Student.findOne({email});
    if(!student)
    {
        throw new ApiError(404, "Student doesn not have an email or the email entered is not of any student.");
    }

    // generating a six digit otp, its expiry for the email required.
    const otp = randomInt(100000, 1000000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    // deleting the previously created documents of the same email in the otp model.
    const deletedDocuments = await Otp.deleteMany({email});

    // sending the email to the student having the otp.
    const subject = "Email regarding the OTP."
    const text = `Your One-Time Password (OTP) for password reset is ${otp}.
    This OTP is valid for 5 minutes. Please do not share it with anyone for security reasons.`
    const sentMail = await sendEmail(email, subject, text);
    if(sentMail.accepted.length === 0)
    {
        throw new ApiError(500, "OTP could not be sent due to server errors.");
    }

    // creating a new document in otp model and saving all details in it.
    const createdDocument = await Otp.create({email, otp, otpExpiry});
    if(!createdDocument)
    {
        throw new ApiError(500, "Otp document could not be made.");
    }

    // returning the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully to the student."));
})

const verifyOtp = asyncHandler(async(req, res) => {

    // destructuring the OTP and the email to which it was sent from the body of the request body.
    const {otp, email} = req.body;

    // checking if the fields are filled or not.
    if([otp, email].some(field => !field || field.trim() === ""))
    {
        throw new ApiError(400, "All fields are required.");
    }

    // checking if the otp is sent on the given email.
    const sentOtp = await Otp.findOne({email});
    if(!sentOtp)
    {
        throw new ApiError(404, "OTP is not sent on the given email address.");
    }

    // checking if the given otp is correct and checking if it is sent in the given time duration.
    if(sentOtp.otpExpiry < Date.now())
    {
        throw new ApiError(400, "OTP has already expired.");
    }
    if(sentOtp.otp !== otp)
    {
        throw new ApiError(400, "Incorrect OTP, please submit correct OTP.");
    }

    // checking if the otp is currently verified or not.
    if(sentOtp.hasVerified)
    {
        throw new ApiError(400, "OTP already verified.");
    }

    // validating the otp.
    sentOtp.hasVerified = true;
    await sentOtp.save({validateBeforeSave: false});

    // returning the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP is successfully verified."));
})

export {
    registerStudent,
    loginStudent,
    logoutStudent,
    refreshAccessToken,
    changeStudentPassword,
    viewProfile,
    generateOtp,
    verifyOtp
}