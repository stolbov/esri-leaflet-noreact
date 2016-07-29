var fs = require("fs");
var express = require('express');
var routers = express.Router();
var multiparty = require('multiparty');

var Datastore = require('nedb');
var db = {};
db.attachs = new Datastore(__dirname + '/db/attachs.db');
db.attachs.loadDatabase();

routers.get('/', function(req, res) {
    res.send('API');
});

routers.get('/attachs/:id', function (req, res) {
  db.attachs.find({ featureId: req.params.id}, function (err, docs) {
    res.json(docs);
  });
});

routers.get('/attachs', function (req, res) {
  db.attachs.find({}, function (err, docs) {
    res.json(docs);
  });
});

routers.post('/attachs/delete/:attachId', function (req, res, next) {
  db.attachs.find({ _id: req.params.attachId}, function (err, docs) {
    if (docs[0]) {
      fs.unlinkSync('./attaches/' + docs[0].fileName);
      db.attachs.remove({_id: req.params.attachId}, {});
    }
    res.json({success: 'ok'});
  });
});

routers.post('/attachs/upload/:featureId', function (req, res, next) {
  var featureId = req.params.featureId;
  var form = new multiparty.Form();
  var uploadFile = {uploadPath: '', type: '', size: 0};
  var maxSize = 2 * 1024 * 1024; //2MB
  var supportMimeTypes = ['image/jpg', 'image/jpeg', 'image/png'];
  var errors = [];
  form.on('error', function(err){console.log(err);});

  form.on('part', function(part) {
      uploadFile.size = part.byteCount;
      uploadFile.type = part.headers['content-type'];
      uploadFile.path = './attaches/' + part.filename;

      if(uploadFile.size > maxSize) {
        errors.push('File size is ' + uploadFile.size + '. Limit is' + (maxSize / 1024 / 1024) + 'MB.');
      }

      if(supportMimeTypes.indexOf(uploadFile.type) == -1) {
        errors.push('Unsupported mimetype ' + uploadFile.type);
      }

      if(errors.length == 0) {
        var out = fs.createWriteStream(uploadFile.path);
        part.pipe(out);
        db.attachs.insert({
          featureId: featureId,
          fileName: part.filename
        });
      } else {
        part.resume();
      }
  });

  form.on('close', function() {
      if(errors.length == 0) {
        res.send({status: 'ok', text: 'Success'});
      }
      else {
        if(fs.existsSync(uploadFile.path)) {
          fs.unlinkSync(uploadFile.path);
        }
        res.send({status: 'bad', errors: errors});
      }
  });

  form.parse(req);
});



module.exports = routers;
