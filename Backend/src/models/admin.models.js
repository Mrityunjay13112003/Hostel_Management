import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adminSchema = new Schema({
    adminId: {
        type: String,
        required: [true, "userId is mandatory"], 
        unique: true
    },
    password: {
        type: String,
        required: [true, "password is mandatory"]
    },
    refreshToken: {
        type: String
    }
}, {timestamps: true});

adminSchema.pre("save", async function()
{
    if(this.isModified("password"))
    {
        this.password = await bcrypt.hash(this.password, 10);
    }
})

adminSchema.methods.checkPassword = async function(password)
{
    return await bcrypt.compare(password, this.password);
}

adminSchema.methods.generateAccessToken = function()
{
    return jwt.sign(
        {
            _id: this._id,
            adminId: this.adminId
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

adminSchema.methods.generateRefreshToken = function()
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

export const Admin = mongoose.model("Admin", adminSchema);