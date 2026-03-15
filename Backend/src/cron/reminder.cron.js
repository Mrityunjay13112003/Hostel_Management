import { Student } from "../models/students.models.js";
import { Guardian } from "../models/guardians.models.js";
import { Parent } from "../models/parents.models.js";
import { Fee } from "../models/fees.models.js";
import nodeCron from "node-cron";
import {htmlTemplate, reminder} from "../template/reminder.template.js"
import { sendEmail } from "../utils/email.utils.js";

// actual fee reminder logic.
const feeReminder = async() => {

    try
    {
        // fetching all the documents from the db whose dueDate < today and balance > 0.
        const today = new Date();
        const feeDocuments = await Fee.find({
            "dueDate": {$lte: today},
            "balance": {$gt: 0}
        });
        if(!feeDocuments.length)
        {
            return;
        }
        const students = feeDocuments.map(student => student.student_id);

        // fetching the emails of the parents, guardians, and students of the found documents.
        let emails = [];
        for(const student of students)
        {
            const [studentDoc, parentDoc, guardianDoc] = await Promise.all([
                Student.findOne({_id: student}).select("email"),
                Parent.findOne({student_id: student}).select("parentEmail"),
                Guardian.findOne({student_id: student}).select("guardianEmail")
            ])
            emails.push(
                studentDoc?.email,
                parentDoc?.parentEmail,
                guardianDoc?.guardianEmail
            );
        }
        emails = emails.filter(Boolean);

        // sending the email to all the found email addresses.
        const html = htmlTemplate();
        await Promise.all(
            emails.map(email =>
                sendEmail(email, "Reminder for fee payment.", "", html)
            )
        );
    }
    catch(err)
    {
        console.log(err.message);
        throw err;
    }
}

// for scheduling the reminder logic.
const scheduleReminder = () => {
    try
    {
        return nodeCron.schedule("0 9 * * *", feeReminder)
    }
    catch(err)
    {
        console.log(err.message);
        throw err;
    }
}

export {scheduleReminder}