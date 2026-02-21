import mongoose from "mongoose";

const userSchema = new Schema({
    userId: {
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

export const User = mongoose.model("User", userSchema);