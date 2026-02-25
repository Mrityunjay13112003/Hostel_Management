import mongoose,{Schema} from "mongoose";

const parentSchema = new Schema({
    student_id: {
        type: Schema.Types.ObjectId,
        ref: "Student"
    },
    parentName: {
        type: String,
        required: true
    },
    parentMobileNumber: {
        type: String,
        required: true
    },
    parentEmail: {
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