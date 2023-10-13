const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const serialize = require('node-serialize');
const Agenda = require('agenda');

dotenv.config();

const app = express();
app.use(express.json());

const dataFilePath = 'cron-jobs.json';
let cronJobs = {};

const mongoConnectionString = process.env.MONGO_URL; // Replace with your MongoDB URL
const agenda = new Agenda({ db: { address: mongoConnectionString } });

agenda.define('send-email', async(job) => {
    // console.log(job)
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
            text: emailText,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${emailSubject}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
});


app.post('/create-cron-job', async(req, res) => {
    const { emailRecipient, jobIdsToDelete } = req.body;

    // Schedule to send an email 5 minutes from now
    const job1 = await agenda.schedule('in 1 minutes', 'send-email', {
        emailRecipient,
        emailSubject: 'Hello (5-minute job)',
        emailText: 'Hi there from the 5-minute job!',
    });

    // Schedule to send an email 2 hours from now
    const job2 = await agenda.schedule('in 2 hours', 'send-email', {
        emailRecipient,
        emailSubject: 'Hello (2-hour job)',
        emailText: 'Hi there from the 2-hour job!',
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