const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const Agenda = require('agenda');
const generate = require('./generate_email');
const cors = require('cors')

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors())


const mongoConnectionString = process.env.MONGO_URL; // Replace with your MongoDB URL
const agenda = new Agenda({ db: { address: mongoConnectionString } });

agenda.define('send-email', async(job) => {
    // console.log(process.env)
    try {
        const { emailRecipient, emailSubject, emailText } = job.attrs.data;

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVICE_PROVIDER,
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailRecipient,
            subject: emailSubject,
            html: generate(JSON.parse(emailText)),
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${emailSubject}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
});


app.post('/create-cron-job', async(req, res) => {
    const { emailRecipient, jobIdsToDelete, data } = req.body;

    // Schedule to send an email 5 minutes from now
    const job1 = await agenda.schedule('in 1 minutes', 'send-email', {
        emailRecipient,
        emailSubject: "Don't Miss Out on Your Cart - Complete Your Purchase Today!",
        emailText: JSON.stringify(data),
    });

    // Schedule to send an email 2 hours from now
    const job2 = await agenda.schedule('in 2 hours', 'send-email', {
        emailRecipient,
        emailSubject: "Don't Miss Out on Your Cart - Complete Your Purchase Today!",
        emailText: JSON.stringify(data),
    });

    const jobId1 = job1.attrs._id.toString();
    const jobId2 = job2.attrs._id.toString();

    // Automatically delete the specified jobs if provided
    if (jobIdsToDelete && Array.isArray(jobIdsToDelete)) {
        for (const jobIdToDelete of jobIdsToDelete) {
            await agenda.cancel({ _id: jobIdToDelete });
            console.log(`Job ${jobIdToDelete} was deleted as requested.`);
        }
    }

    res.json({ jobId1, jobId2 });
});



agenda.start().then(() => {
    console.log('Agenda started successfully');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});