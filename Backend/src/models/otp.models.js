import mongoose, {Schema} from "mongoose";

const otpSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true
    },
    hasVerified: {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

export const Otp = mongoose.model("Otp", otpSchema);