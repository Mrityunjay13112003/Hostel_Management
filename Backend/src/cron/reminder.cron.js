import { Fee } from "../models/fees.models.js";
import nodeCron from "node-cron";
import {htmlTemplate} from "../template/reminder.template.js"
import { sendEmail } from "../utils/email.utils.js";

// actual fee reminder logic.
const feeReminder = async() => {

    try
    {
        // fetching all the documents from the db whose dueDate < today and balance > 0.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const feeDocuments = await Fee.aggregate([
            {
                $match: {
                    "dueDate": {$lte: today},
                    "balance": {$gt: 0}
                }
            },
            {
                $lookup: {
                    from: "students",
                    localField: "student_id",
                    foreignField: "_id",
                    as: "student"
                }
            },
            {
                $lookup: {
                    from: "guardians",
                    localField: "student_id",
                    foreignField: "student_id",
                    as: "guardian"
                }
            },
            {
                $lookup: {
                    from: "parents",
                    localField: "student_id",
                    foreignField: "student_id",
                    as: "parent"
                }
            },
        ]);
        if(!feeDocuments.length)
        {
            return;
        }
        
        const sendReminderEmail = async(feeDocument) => {
            let emails = [
                feeDocument.student?.[0]?.email,
                feeDocument.parent?.[0]?.parentEmail,
                feeDocument.guardian?.[0]?.guardianEmail
            ];
            emails = emails.filter(email => Boolean(email));
            emails = [...new Set(emails)];

            const subject = `Fee Payment Reminder`;
            const html = htmlTemplate(feeDocument.student?.[0]?.name, feeDocument?.dueDate, feeDocument?.balance)
            await Promise.all(emails.map(email => sendEmail(email, subject, "", html)));
        }

        await Promise.all(feeDocuments.map(feeDocument => sendReminderEmail(feeDocument)));
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
        return nodeCron.schedule("0 9 * * *", feeReminder, {
            timezone: "Asia/Kolkata"
        })
    }
    catch(err)
    {
        console.log(err.message);
        throw err;
    }
}

export {scheduleReminder}