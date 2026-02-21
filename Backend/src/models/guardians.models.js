import mongoose from "mongoose";

const guardianSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student"
    },
    name: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    address: {
        type: String,
        required: true
    }
}, {timestamps: true});

export const Guardian = mongoose.model({}, {timestamps: true});