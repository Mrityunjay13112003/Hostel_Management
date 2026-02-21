import mongoose from "mongoose";

const parentSchema = new Schema({
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
    occupation: {
        type: String
    }
}, {timestamps: true});

export const Parent = mongoose.model("Parent", parentSchema);