import mongoose from "mongoose";

const feeSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student"
    },
    plan: {
        type: Number,
        required: true
    },
    advance: {
        type: Number
    },
    balance: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    remark: {
        type: String,
        required: true
    }
}, {timestamps: true});

export const Fee = mongoose.model("Fee", feeSchema);