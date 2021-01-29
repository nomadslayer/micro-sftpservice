This is a SFTP server that pushes files to destination SFTP server
The gitbot.json is a development json to connect to the development project in GCP

Create GCP IAM
Go to GCP and create and ID and copy it to the project and you can replace the gitbot.json

Identification to access SFTP using RSA
generate a key from the SFTP server and provide the rsa and replace the public 'test_id_rsa' to this SFTP client


GCP Bucket
The bucket is divided into 
bucket name : {give a bucket name}
bucket folder:  pending, receive, sent
sub folder for each bucket is the date: ddmmyyyy
filename can be: pending/ddmmyyyy/<filename>-date.csv


Mechanism of work
Setting up the server
1. You can buy a micro server from GCP and run this code in it.
2. Pull code from the gitlab repo
3. Install PM2
4. Get the app.js to start under PM2


Adding google cloud function
1. You can add google function to call this program


Upon file being generated, it should be pushed to the pending/ddmmyyyy/ folder.
At a specific time, the Google Cloud Scheduler will trigger Cloud Function to start an Instance
Within the difference of 10 minutes, another Google CLoud Scheduler will trigger the Cloud Function to trigger a command
{
    "action" : "send"
}
encode this in base64
{
    data: <encoded base64>
}

The SFTP will then evaluate the action and take this file and push to the SFTP Server endpoint
Then the file will be move to the sent/ddmmyyyy/ folder

Within another 3 hours difference, another Google CLoud Scheduler will trigger the Cloud Function to trigger a command
{
    "action" : "retrieve"
}
encode this in base64
{
    data: <encoded base64>
}
Upon process by SFTP Server, the result will be published in the SFTP Server SFTP, this Cloud Function will trigger this SFTP program 
to go to the SFTP Server SFTP and retrieve the files and put it in the GCP Storage "{give a bucket name}" bucket > "receive/ddmmyyyy" folder

Service account
1. The service account is created in IAM in GCP and given a storage Admin rights


How to trigger the endpoint for testing
1. Using github, pull the project into instance
2. perform npm install
3. replace the gitbot.json file with the project, this is a service account file, you can create it in GCP
4. To run it, run "npm start"

Using Postman to test 
1. In Postman type to the instance address 
http://<instance ip>:3001/start

select application/json

Put in this value
{
    data: <encoded base64>
}


Cron job
1. Add a cron job in the development or production server 
create a file call tmpclean.sh in /etc/cron.weekly

Add this code in tmpclean.sh
#!/bin/bash

rm -rf /tmp/*.csv 
