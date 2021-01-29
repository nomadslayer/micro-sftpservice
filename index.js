require('dotenv').config({path: __dirname + '/.env'})
let request = require("request")
let fs = require('fs')
let dateFormat = require('dateformat')
let path = require('path')
let client = require('ssh2-sftp-client')
let google = require('googleapis')
let tmp = require('temporary')
let privateKey = fs.readFileSync('./' + process.env.privateKey, {'encoding':'utf8'} )
//const logging = require('./lib/logging')
const { Storage } = require('@google-cloud/storage')
//dotenv.config()

let sftp = new client()

let storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: './gitbot.json'
    })

let sftpConfig = {
    host: process.env.SFTP_SERVER,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USER,
    privatekey: privateKey
}

module.exports = function() {
    function sendFiles()  {
        let date = dateFormat(new Date(), "mmddyyyy")
        console.log(date)
        const options = { prefix : process.env.PREFIX_PENDINGFOLDER + date + "/"}
        console.log(process.env.PREFIX_PENDINGFOLDER + date)
    options.delimiter = '/'
    let filelist = []

    const bucket = storage.bucket(process.env.BUCKET_NAME)
  
    bucket.getFiles(options)
        .then(results => {
            const [files] = results

            files.forEach(file => {
                if(file.name.includes('csv') )
                {
                    filelist.push(file.name)
                    console.log(file.name)
                }
            })

            let filedata = new Buffer.from('', 'Binary')
            let filebasename = null
            console.log(sftpConfig)
            sftp.connect(sftpConfig).then(() => {
                console.log("connect")
                let count =0
                for (let i =0; i<=filelist.length-1; i++)
                {
                    let fullPath = filelist[i]
                    
                    bucket.file(fullPath).download(function(err, contents) {
                        filedata = contents  
                        
                        filebasename = path.basename(filelist[i])
  
                        sftp.put(filedata, filebasename, [true])
                        // upload to another folder
                        let tmpfile = new tmp.File()

                        let wsstream = fs.createWriteStream(tmpfile.path)
                        wsstream.write(filedata)
                        
                        fs.rename(tmpfile.path, '/tmp/'+ filebasename, function(err){
                            if(err){
                                throw new Error(err) 
                            }
                        })
                        bucket.upload('/tmp/'+filebasename, {destination:'/sent/'+ date + "/" +filebasename}, function(err, file){
                            if(err) throw new Error(err) 
                        })
                    })
                    count++
                }

                if(count==filelist.length-1)
                {
                    sftp.end()
                }
                    
            }).catch(err => {
                //logging.warn('Error', err)
                console.log('Error:', err)
            })
        })     
    }

    function getFilesFromSFTP() {
        let date = dateFormat(new Date(), "mmddyyyy")
        const bucket = storage.bucket(process.env.BUCKET_NAME)
        let regex = "((?i)"+date+"(?-i))"
        console.log(regex)
        sftp.connect(sftpConfig).then(() => {
            return sftp.list(process.env.SFTP_OUTPUT_PATH_REPORTS)
        }).then((data) => {
            console.log(data)
            for(var i=0, len= data.length; i< len; i++)
            {
                if(data[i].name.match(date))
                {
                    console.log(data[i].name)
                    let name = data[i].name
                    sftp.get(name).then((stream) => { 
                        let tmpfile = new tmp.File()
                        let wsstream = fs.createWriteStream(tmpfile.path)
                        wsstream.write(stream)

                        fs.rename(tmpfile.path, '/tmp/'+ name, function(err){
                            if(err){
                                throw new Error(err) 
                            }
                        })

                        bucket.upload('/tmp/'+name, {destination: process.env.PREFIX_RECEIVEFOLDER+ date + "/" +name}, function(err, file){
                            if(err) throw new Error(err) 
                        })

                    })
                }
                
            }
        })
        .catch((err) => {
            //logging.warn('Error', err)
            console.log('Error:', err)
        })

        sftp.connect(sftpConfig).then(() => {
            return sftp.list(process.env.SFTP_OUTPUT_PATH_ERRORS)
        }).then((data) => {
            console.log(data)
            for(var i=0, len= data.length; i< len; i++)
            {
                if(data[i].name.match(date))
                {
                    console.log(data[i].name)
                    let name = data[i].name
                    sftp.get(name).then((stream) => { 
                        let tmpfile = new tmp.File()
                        let wsstream = fs.createWriteStream(tmpfile.path)
                        wsstream.write(stream)

                        fs.rename(tmpfile.path, '/tmp/'+ name, function(err){
                            if(err){
                                throw new Error(err) 
                            }
                        })

                        bucket.upload('/tmp/'+name, {destination: process.env.PREFIX_RECEIVEFOLDER+ date + "/" +name}, function(err, file){
                            if(err) throw new Error(err) 
                        })

                    })
                }
                
            }
        })
        .catch((err) => {
            //logging.warn('Error', err)
            console.log('Error:', err)
        })
    }

    return {
        sendFiles : sendFiles,
        getFilesFromSFTP : getFilesFromSFTP
    }
}
