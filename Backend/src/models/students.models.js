import mongoose from "mongoose";

const studentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    institute: {
        type: String,
        required: true
    },
    education: {
        type: String,
        required: true
    },
    dateOfJoining: {
        type: Date
    },
    isAdmitted: {
        type: Boolean,
        default: false
    },
    hasLeft: {
        type: Boolean,
        default: false
    },
    photo: {
        type: String, // cloudinary url
        required: true
    }
}, {timestamps: true});

export const Student = mongoose.model("Student", studentSchema);