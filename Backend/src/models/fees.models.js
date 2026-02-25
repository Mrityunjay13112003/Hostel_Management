import mongoose,{Schema} from "mongoose";

const feeSchema = new Schema({
    student_id: {
        type: Schema.Types.ObjectId,
        ref: "Student"
    },
    plan: {
        type: Number,
    },
    advance: {
        type: Number
    },
    balance: {
        type: Number,
    },
    paymentDate: {
        type: Date,
    },
    dueDate: {
        type: Date,
    },
    remark: {
        type: String,
    }
}, {timestamps: true});

export const Fee = mongoose.model("Fee", feeSchema);