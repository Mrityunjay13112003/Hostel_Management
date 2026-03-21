import mongoose, {Schema} from mongoose;

const paymentDetailsSchema = new Schema({
    monthAndYear: {
        type: String,
        required: true,
        unique: true
    },
    students: [
        {
            student_id: {
                type: Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
            plan: {
                type: Number
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
        }
    ]
}, {timestamps: true});

export const Detail = mongoose.model("Detail", paymentDetailsSchema);