var express = require('express');
var bodyParser = require('body-parser')
var multer = require('multer');
var AWS = require('aws-sdk');
var app = express();

var mongodb = require('mongodb');

var MONGODB_USERNAME = (process.env["MONGODB_USERNAME"] || "").trim();
var MONGODB_PASSWORD = (process.env["MONGODB_PASSWORD"] || "").trim();
var MONGODB_HOST = (process.env["MONGODB_HOST"] || "").trim();
var MONGODB_DB_NAME = (process.env["MONGODB_DB_NAME"] || "").trim();
var MONGODB_DB_PARAM = (process.env["MONGODB_DB_PARAM"] || "").trim();

// Helper function to sanitize credentials (remove all control characters including newlines)
function sanitizeCredential(value) {
  if (!value) return value;
  return value.toString().replace(/[\r\n\t\f\v]/g, '').trim();
}

// S3/MinIO Configuration
var S3_ENDPOINT = sanitizeCredential(process.env["S3_ENDPOINT"]) || "minio:9000";
var S3_ACCESS_KEY = sanitizeCredential(process.env["S3_ACCESS_KEY"]) || "minioadmin";
var S3_SECRET_KEY = sanitizeCredential(process.env["S3_SECRET_KEY"]) || "minioadmin";
var S3_BUCKET = sanitizeCredential(process.env["S3_BUCKET"]) || "visiting-cards";
var S3_USE_SSL = sanitizeCredential(process.env["S3_USE_SSL"]) || "false";
var S3_REGION = sanitizeCredential(process.env["S3_REGION"]) || "us-east-1";

// Log S3 configuration (without exposing full secrets)
console.log('S3 Configuration:');
console.log('  Endpoint:', S3_ENDPOINT);
console.log('  Bucket:', S3_BUCKET);
console.log('  Region:', S3_REGION);
console.log('  Use SSL:', S3_USE_SSL);
console.log('  Access Key Length:', S3_ACCESS_KEY ? S3_ACCESS_KEY.length : 0);
console.log('  Secret Key Length:', S3_SECRET_KEY ? S3_SECRET_KEY.length : 0);

var mongodb_uri = "mongodb://"
if(MONGODB_USERNAME!="") { mongodb_uri = mongodb_uri + MONGODB_USERNAME +":"+ MONGODB_PASSWORD + "@" }
var MONGODB_DB_PARAM = process.env["MONGODB_DB_PARAM"];
mongodb_uri = mongodb_uri + MONGODB_HOST + "/" +  MONGODB_DB_NAME + "?" + MONGODB_DB_PARAM

var mongoClient = mongodb.MongoClient;


var collection;
var visitingCardsCollection;
var db = mongoClient.connect(mongodb_uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, function (err, db) {
  if (err)
    throw err;
  console.log("Connected to the mongoDB !");
  collection = db.db('guestbook').collection('greetings');
  visitingCardsCollection = db.db('guestbook').collection('visiting-cards');
});

// Configure S3/MinIO client
// Handle endpoint with or without protocol
var s3Endpoint = S3_ENDPOINT;
if (!s3Endpoint.startsWith('http://') && !s3Endpoint.startsWith('https://')) {
  s3Endpoint = (S3_USE_SSL === "true" ? "https://" : "http://") + s3Endpoint;
}

var s3Client = new AWS.S3({
  endpoint: s3Endpoint,
  accessKeyId: S3_ACCESS_KEY,
  secretAccessKey: S3_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: S3_REGION
});

// Initialize S3 bucket on startup
function initializeS3Bucket() {
  s3Client.headBucket({ Bucket: S3_BUCKET }, function(err, data) {
    if (err && err.code === 'NotFound') {
      // Bucket doesn't exist, create it
      s3Client.createBucket({ Bucket: S3_BUCKET }, function(err, data) {
        if (err) {
          console.error('Error creating S3 bucket:', err);
        } else {
          console.log('S3 bucket created successfully:', S3_BUCKET);
        }
      });
    } else if (err) {
      console.error('Error checking S3 bucket:', err);
    } else {
      console.log('S3 bucket exists:', S3_BUCKET);
    }
  });
}

// Initialize bucket after a short delay to ensure S3 is ready
setTimeout(initializeS3Bucket, 2000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for file uploads (memory storage)
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get('/guestbook', function (req, res) {
  collection.find().sort({ _id: -1 }).toArray((err, guestbook) => {
    if (err) {
      console.error('Error fetching guestbook:', err);
      res.statusCode = 500;
      return res.send('Error 500: Failed to fetch guestbook.');
    }
    
    // Fetch visiting cards and match them by name
    visitingCardsCollection.find().sort({ _id: -1 }).toArray((err, cards) => {
      if (err) {
        console.error('Error fetching visiting cards:', err);
        // Still return guestbook even if visiting cards fail
        return res.send(guestbook);
      }
      
      // Create a map of visiting cards by name (case-insensitive)
      var cardsByName = {};
      cards.forEach(function(card) {
        var nameKey = card.name.toLowerCase().trim();
        // If multiple cards for same name, use the most recent one
        if (!cardsByName[nameKey] || new Date(card.uploadedAt) > new Date(cardsByName[nameKey].uploadedAt)) {
          cardsByName[nameKey] = card;
        }
      });
      
      // Add visiting card info to guestbook entries
      var guestbookWithCards = guestbook.map(function(entry) {
        var entryCopy = Object.assign({}, entry);
        var nameKey = (entry.name || '').toLowerCase().trim();
        if (cardsByName[nameKey]) {
          entryCopy.visitingCard = {
            fileUrl: cardsByName[nameKey].fileUrl,
            fileName: cardsByName[nameKey].fileName,
            originalName: cardsByName[nameKey].originalName
          };
        }
        return entryCopy;
      });
      
      res.send(guestbookWithCards);
    });
  })
});

app.post('/guestbook', function (req, res) {
  if (!req.body) {
    res.statusCode = 400;
    return res.send('Error 400: Post syntax incorrect.');
  }
  var newGreeting = req.body;
  collection.insertOne(newGreeting, (err, greeting) => {
    if (err) console.log(err);
    res.send(greeting);
  })
});

// Get all visiting cards
app.get('/visiting-cards', function (req, res) {
  visitingCardsCollection.find().sort({ _id: -1 }).toArray((err, cards) => {
    if (err) {
      console.error('Error fetching visiting cards:', err);
      res.statusCode = 500;
      return res.send('Error 500: Failed to fetch visiting cards.');
    }
    res.send(cards);
  });
});

// Upload visiting card
app.post('/visiting-cards', upload.single('visitingCard'), function (req, res) {
  if (!req.file) {
    res.statusCode = 400;
    return res.send('Error 400: No file uploaded.');
  }

  var file = req.file;
  var name = req.body.name || 'Anonymous';
  var message = req.body.message || '';
  
  // Generate unique filename
  var timestamp = Date.now();
  var fileExtension = file.originalname.split('.').pop();
  var fileName = 'visiting-card-' + timestamp + '-' + Math.random().toString(36).substring(7) + '.' + fileExtension;
  
  // Upload to S3/MinIO
  var params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  s3Client.upload(params, function(err, data) {
    if (err) {
      console.error('Error uploading to S3:', err);
      res.statusCode = 500;
      return res.send('Error 500: Failed to upload file to S3.');
    }

    // Construct file URL (MinIO uses path-style URLs)
    var fileUrl = data.Location;
    // If Location doesn't work properly with MinIO, construct it manually
    if (!fileUrl || fileUrl.indexOf('http') !== 0) {
      // Extract endpoint and protocol
      var endpointForUrl = S3_ENDPOINT;
      var protocol = "http";
      
      if (endpointForUrl.startsWith('http://')) {
        protocol = "http";
        endpointForUrl = endpointForUrl.replace('http://', '');
      } else if (endpointForUrl.startsWith('https://')) {
        protocol = "https";
        endpointForUrl = endpointForUrl.replace('https://', '');
      } else {
        // Use S3_USE_SSL if endpoint doesn't have protocol
        protocol = S3_USE_SSL === "true" ? "https" : "http";
      }
      
      fileUrl = protocol + "://" + endpointForUrl + "/" + S3_BUCKET + "/" + fileName;
    }

    // Store metadata in MongoDB
    var visitingCardData = {
      name: name,
      message: message,
      fileName: fileName,
      originalName: file.originalname,
      fileUrl: fileUrl,
      fileSize: file.size,
      uploadedAt: new Date()
    };

    visitingCardsCollection.insertOne(visitingCardData, (err, result) => {
      if (err) {
        console.error('Error saving to MongoDB:', err);
        res.statusCode = 500;
        return res.send('Error 500: Failed to save visiting card metadata.');
      }
      res.send(result.ops[0]);
    });
  });
});

app.listen(3000, function () {
  console.log('Guestbook API listening on port 3000!')
});
