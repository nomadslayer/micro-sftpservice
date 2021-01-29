

// Activate Google Cloud Trace and Debug when in production
/* if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent').start();
}
 */
require('dotenv').config({path: __dirname + '/.env'})
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
//const logging = require('./lib/logging');
let worker = require('./index.js')()

// When running on Google App Engine Managed VMs, the worker needs
// to respond to HTTP requests and can optionally supply a health check.
// [START server]
const app = express();

const jsonParser = bodyParser.json();

//app.use(logging.requestLogger);

// [START endpoint]
app.post('/start', jsonParser, (req, res) => {
/*   if (!req.body || !req.body.message || !req.body.message.data) {
    console.log(req.body)
    //logging.warn('Bad request');
    return res.sendStatus(400);
  } */

  const dataUtf8encoded = Buffer.from(req.body.data, 'base64').toString()
  var content;

  try {
    content = JSON.parse(dataUtf8encoded)
    console.log(content)
  } catch (ex) {
    //logging.warn('Bad request');
    return res.sendStatus(400);
  }

  if (content.action === 'send' ) {
    //logging.info(`Request triggered for sftp push`);
    console.log("send")
    worker.sendFiles()
    return res.sendStatus(200)
  } else if(content.action === 'retrieve'){
    //logging.info(`Request triggered for sftp retrieved processed files`)
    worker.getFilesFromSFTP()
    return res.sendStatus(200)
  }else {
    //logging.warn('Bad request', content);
    return res.sendStatus(400);
  }
});
// [END endpoint]

//app.use(logging.errorLogger);

if (module === require.main) {
  const server = app.listen(process.env.APP_PORT, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
    module.exports=app
  })
}

