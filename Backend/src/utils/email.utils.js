import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text, html) => {

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        html
    }

    try
    {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.response}`);
        return info;
    }
    catch(err)
    {
        console.log(err);
        throw err;
    }
}

export {sendEmail};