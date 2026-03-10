import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const studentSchema = new Schema({    
    studentId: {
        type: String
    },
    password: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date
    },
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: true
    },
    institute: {
        type: String
    },
    education: {
        type: String
    },
    dateOfJoining: {
        type: Date
    },
    isAdmitted: {
        type: Boolean,
        default: false,
    },
    hasLeft: {
        type: Boolean,
        default: false
    },
    photo: {
        type: String  // cloudinary url.
    },
    remark: {         // only for the inquiry.
        type: String
    },
    refreshToken: {
        type: String
    }
}, {timestamps: true});

studentSchema.pre("save", async function()
{
    if(this.isModified("password"))
    {
        this.password = await bcrypt.hash(this.password, 10);
    }
})

studentSchema.methods.generateAccessToken = function()
{
    return jwt.sign(
        {
            _id: this._id,
            studentId: this.studentId
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

studentSchema.methods.generateRefreshToken = function()
{
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

studentSchema.methods.checkPassword = async function (password)
{
    return await bcrypt.compare(password, this.password);
}

export const Student = mongoose.model("Student", studentSchema);