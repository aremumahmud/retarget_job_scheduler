const emailServiceProvider = process.env.EMAIL_SERVICE_PROVIDER;
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

const express = require('express');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const serialize = require('node-serialize');

dotenv.config();

const app = express();
app.use(express.json());

const dataFilePath = 'cron-jobs.json';
let cronJobs = {};

try {
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    cronJobs = serialize.unserialize(data);
} catch (error) {
    console.error('Error loading cron job data:', error);
}

function saveCronJobData() {
    const serializedData = serialize.serialize(cronJobs);
    fs.writeFileSync(dataFilePath, serializedData, 'utf-8');
}

function deleteCompletedCronJobs() {
    Object.keys(cronJobs).forEach((jobId) => {
        const job = cronJobs[jobId];
        if (job.getStatus() === 'completed') {
            job.stop();
            delete cronJobs[jobId];
            console.log(`Job ${jobId} has completed and was deleted.`);
        }
    });

    saveCronJobData();
}

cron.schedule('*/5 * * * *', () => {
    deleteCompletedCronJobs();
});

const now = new Date();
const fiveMinutesLater = '5 * * * *'; // 5 minutes in the future
const twoHoursLater = '15 * * * *'; // 2 hours in the future

app.post('/create-cron-job', (req, res) => {
    const { emailRecipient, jobIdsToDelete } = req.body;
    const jobId1 = uuidv4();
    const jobId2 = uuidv4();

    const newCronJob1 = cron.schedule(fiveMinutesLater, async() => {
        try {
            const transporter = nodemailer.createTransport({
                service: emailServiceProvider,
                auth: {
                    user: emailUser,
                    pass: emailPassword,
                },
            });

            const mailOptions = {
                from: emailUser,
                to: emailRecipient,
                subject: 'Hello (5-minute job)',
                text: 'Hi there from the 5-minute job!',
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent (5-minute job): ${info.response}`);
        } catch (error) {
            console.error('Error sending email (5-minute job):', error);
        }
    });

    const newCronJob2 = cron.schedule(twoHoursLater, async() => {
        try {
            const transporter = nodemailer.createTransport({
                service: emailServiceProvider,
                auth: {
                    user: emailUser,
                    pass: emailPassword,
                },
            });

            const mailOptions = {
                from: emailUser,
                to: emailRecipient,
                subject: 'Hello (2-hour job)',
                text: 'Hi there from the 2-hour job!',
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent (2-hour job): ${info.response}`);
        } catch (error) {
            console.error('Error sending email (2-hour job):', error);
        }
    });

    cronJobs[jobId1] = newCronJob1;
    cronJobs[jobId2] = newCronJob2;

    // saveCronJobData();

    // if (jobIdsToDelete && Array.isArray(jobIdsToDelete)) {
    //     jobIdsToDelete.forEach((jobIdToDelete) => {
    //         const jobToDelete = cronJobs[jobIdToDelete];
    //         if (jobToDelete) {
    //             jobToDelete.stop();
    //             delete cronJobs[jobIdToDelete];
    //             console.log(`Job ${jobIdToDelete} was deleted as requested.`);
    //         }
    //     });
    //}

    res.json({ jobId1, jobId2 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});