import mongoose,{Schema} from "mongoose";

const guardianSchema = new Schema({
    student_id: {
        type: Schema.Types.ObjectId,
        ref: "Student"
    },
    guardianName: {
        type: String,
        required: true
    },
    guardianMobileNumber: {
        type: String,
        required: true
    },
    guardianEmail: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    guardianAddress: {
        type: String,
        required: true
    }
}, {timestamps: true});

export const Guardian = mongoose.model("Guardian", guardianSchema);