const express = require('express')
const formidable = require('express-formidable')
const cors = require('cors')
const app = express()
app.use(formidable())

var fs = require('fs');
var readline = require('readline');
var { google } = require('googleapis');
const youtube = google.youtube("v3");


var OAuth2 = google.auth.OAuth2;

var SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

var oauth2Client = null;


function authorize(credentials, callback, response) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    try {
        getNewToken(oauth2Client, callback, response);
    } catch (error) {
        response.send(error)
    }
}

function getNewToken(oauth2Client, callback, response) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.warn(`authUrl:`, authUrl)
    response.redirect(authUrl)
}

function storeToken(token) {
    try {
        console.warn(TOKEN_PATH);
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}

function getChannel(auth) {
    // var service = google.youtube('v3')
    youtube.channels.list({
        auth: auth,
        part: 'snippet,contentDetails,statistics',
        forHandle: '@telangana-talks'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0) {
            console.log('No channel found.');
        } else {
            console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                'it has %s views.',
                channels[0].id,
                channels[0].snippet.title,
                channels[0].statistics.viewCount);
        }
    });
}

var corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    optionsSuccessStatus: 200
}

app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send(`PP NODE API.`)
})

app.get('/api/sessions/oauth/google-login', cors(corsOptions), (req, res) => {
    fs.readFile('./client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }

        authorize(JSON.parse(content), getChannel, res);
    });
})

app.get('/api/sessions/oauth/google-redirect', cors(corsOptions), async (req, res) => {
    const code = req.query.code
    oauth2Client.getToken(code, function (err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            res.send(err)
            return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        getChannel(oauth2Client);
    });
    res.send('G AUTH Done!')
    // console.warn(code)

})

app.post('/upload/youtube-channel', cors(corsOptions), async (req, res) => {
    if (req.files) {
        try {
            const { title, description } = req.fields
            const fileSize = req.files.file.size;
            
            const response = await youtube.videos.insert(
                {
                    auth: oauth2Client,
                    part: 'id,snippet,status',
                    notifySubscribers: false,
                    requestBody: {
                        snippet: {
                            title: title,
                            description: description,
                        },
                        status: {
                            privacyStatus: 'private',
                        },
                    },
                    media: {
                        body: fs.createReadStream(req.files.file.path),
                    },
                },
                {
                    // Use the `onUploadProgress` event from Axios to track the
                    // number of bytes uploaded to this point.
                    onUploadProgress: evt => {
                        const progress = (evt.bytesRead / fileSize) * 100;
                        readline.clearLine(process.stdout, 0);
                        readline.cursorTo(process.stdout, 0, null);
                        process.stdout.write(`${Math.round(progress)}% complete`);
                    },
                }
            );
            console.log('\n\n');
            console.log(response.data);
            res.send(response.data);

        } catch (error) {
            res.send(error)
        }
    } else {
        console.warn(Object.keys(req))
        res.send(JSON.stringify(req.fields));
    }
})

app.listen(process.env.SERVER_PORT, () => {
    console.log(`PP NODE SERVER STARTED - Port: ${process.env.SERVER_PORT}`)
})
