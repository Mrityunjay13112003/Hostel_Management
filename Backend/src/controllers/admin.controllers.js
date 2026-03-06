import { Admin } from "../models/admin.models.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import jwt from "jsonwebtoken";
import { Student } from "../models/students.models.js";
import { Fee } from "../models/fees.models.js";
import { Parent } from "../models/parents.models.js";
import { Guardian } from "../models/guardians.models.js";

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

const setFeePlan = asyncHandler(async(req, res) => {  // in admin dashboard.

    // checking if the fee plan is in the body of the request.
    if(!req.body.feePlan)
    {
        throw new ApiError(400, "Fee plan is required");
    }

    // extracting the fee plan from the body of the request body.
    const feePlan = req.body.feePlan;
    
    // taking all the students model from the db which are in the hostel.
    const students = await Student.find({hasLeft: false}).select("_id");

    // checking if there are any active students or not.
    if(!students.length)
    {
        throw new ApiError(404, "No active student found");
    }

    // storing the ids of all students in an array.
    const studentID = students.map(student => student._id);

    // updating the plan field in the fee model of the obtained students.
    await Fee.updateMany({student_id: {$in: studentID}}, {$set: {plan: feePlan}});

    // sending the final successful response.
    res
    .status(200)
    .json(new ApiResponse(200, {}, "Fee updated successfully"));
})

const inquiryAddition = asyncHandler(async(req, res) => {    // in admin dashboard.

    // destructuring the data from the body of the request object.
    const {name, address, remark, mobileNumber} = req.body;

    // checking if all the fields are filled or not.
    if([name, address, remark, mobileNumber].some(field => !field || field.trim() === ""))
    {
        throw new ApiError(400, "All fields are required.");
    }

    // creating a new document in db for the new inquiry.
    const inquiry = await Student.create({name, address, dateOfJoining: Date.now(), remark, mobileNumber});

    // checking if the new document is created or not.
    const createdInquiry = await Student.findById(inquiry._id);
    if(!createdInquiry)
    {
        throw new ApiError(500, "Something went wrong while registering the new inquiry.");
    }

    // returning the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, createdInquiry, "Inquiry is successfully stored in the database."));
})

const adminDashboard = asyncHandler(async (req, res) => {

    // fetching names of all types of students in parallel manner.
    const [inquiredStudents, currentStudents, leftStudents] = await Promise.all([
        Student.find({ isAdmitted: false }).select("name"),
        Student.find({ isAdmitted: true, hasLeft: false }).select("name"),
        Student.find({ hasLeft: true }).select("name")
    ]);

    // creating final data object.
    const data = {
        adminId: req.user.adminId,
        inquiredStudents,
        currentStudents,
        leftStudents
    };

    // returning the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, data, "All required data finally retrieved"));

})

const getStudent = asyncHandler(async(req, res) => {  // in admin dashboard. 

    // extracting the _id of the required student from the url of the request.
    const id = req.params._id;

    // checking if the id is given or not.
    if(!id)
    {
        throw new ApiError(400, "Id of the student is required");
    }

    // getting the details of the student from the database.
    const studentData = await Student.findById(id).select("-refreshToken -password").lean();

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

    // sending the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, studentData, "Data of the required student is returned successfully"));
})

const leaveStudentOrInquiry = asyncHandler(async(req, res) => {

    // extracting the _id of the required student from the params of the request object.
    const id = req.params._id;

    // checking if the _id is given in the params or not.
    if(!id)
    {
        throw new ApiError(404, "Id of the student is not given");
    }

    // extracting the document of the required student from the db.
    const student = await Student.findById(id).select("-password -refreshToken");

    // checking if the student document is present or not.
    if(!student)
    {
        throw new ApiError(400, "No such student is present in the database.");
    }

    // checking if the student is inquiry or is an admitted student and returning the response as required.
    if(!student.isAdmitted)
    {
        const deletedInquiry = await Student.findByIdAndDelete(id);

        if(!deletedInquiry)
        {
            throw new ApiError(500, "Inquiry is not deleted.");
        }

        // returning the final response.
        return res
        .status(200)
        .json(new ApiResponse(200, deletedInquiry, "Inquiry is successfully deleted."));
    }

    // updating the hasLeft field of the admitted student document.
    const leftStudent = await Student.findByIdAndUpdate(
        id,
        {hasLeft: true},
        {returnDocument: "after"} // updated document return krta hai.
    );

    // checking if the student document is updated or not.
    if(!leftStudent)
    {
        throw new ApiError(500, "Student document could not be updated.");
    }

    // returning the final response.
    return res
    .status(200)
    .json(new ApiResponse(200, leftStudent, "Student document successfully updated."));
})

export {
    adminLogin,
    adminRegister,
    adminLogout,
    refreshAccessToken,
    setFeePlan,
    inquiryAddition,
    adminDashboard,
    getStudent,
    leaveStudentOrInquiry
};