const express = require("express");
const bodyParser = require("body-parser");
const multer =require("multer");
const fs = require("fs");
const path = require("path")
const mredis = require("./mredis");

const app = express();
const upload = multer({dest:'upload/'}).any();
const allowCrossDomain = function(req, res, next) {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With,content-Type");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    next();
};

app.use(allowCrossDomain);
app.use("/pic" ,express.static('./uploads'))
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));


app.post('/upload',function(req,res){
    console.log("---------访问上传路径-------------"); 

    upload(req, res, function (err) {
    //添加错误处理
     if (err) {
          console.log(err);
          return;
      } 
      
      req.file = req.files[0];
      var tmp_path = req.file.path;
      var file_type = req.file.originalname.lastIndexOf(".")
      var target_name = new Date().getTime() + req.file.originalname.substring(file_type, req.file.originalname.length);
      var target_path = 'uploads/' + target_name;


      if (!fs.existsSync('uploads/')) {
            fs.mkdirSync('uploads/');
      }

      var src = fs.createReadStream(tmp_path);
      var dest = fs.createWriteStream(target_path);
      src.pipe(dest);
      src.on('end', function() {
      	fs.unlink("./" + tmp_path, function(err){
      		if(err) throw err;
      	})
        res.json({fileName: target_name}); 
      });
      src.on('error', function(err) { 
        res.end(); 

      });        
    });
});

app.post('/appendLog', async function(req,res){
	ret = await mredis.expendLog(req.body)
	res.send(ret);
})

app.get("/getLogGroup", async function(res,res){
	ret = await mredis.getLogGroup();
	res.send(ret);
})

app.get("/getLog", async function (req,res) {
  const query = req.query;
  ret = await mredis.getLog(query.id);
  res.send(ret);
})

app.get("/getLogs", async function(req,res){
	ret = await mredis.getLogs();
	res.send(ret);
})

app.get("/logAccess", async function (req,res) {
   const query = req.query;
   ret = await mredis.logReadOrLikePlus(query.id, query.type);
   res.json({retCode: ret});
})

app.get("/verify", async function(req,res){
  const query = req.query;
  ret = await mredis.verify(query.username, query.password);
  res.json({retCode: ret});
})

app.get("/getAlums", async function (req,res) {
  ret = await mredis.getAlums();
  res.send(ret);
})

app.get("/addAlum", async function (req,res) {
  ret = await mredis.addAlum();
  res.json({retCode: ret});
})

app.post("/addPhotos", async function (req,res) {
  const query = req.body;
  ret = await mredis.addPhotos(query.id, query.photos);
  res.json({retCode: ret});
})

app.get("/deletePhoto", async function (req,res)  {
  const query = req.query;
  ret = await mredis.deletePhoto(query.id, query.photo);
  res.json({retCode: ret});
})

app.listen(8900, () => console.log("Example app listening on port:8900"))