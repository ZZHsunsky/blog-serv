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

      /** The original name of the uploaded file
          stored in the variable "originalname". **/
      var target_path = 'uploads/' + req.file.originalname;

      /** A better way to copy the uploaded file. **/

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
        res.end(); 
      });
      src.on('error', function(err) { 
        res.end(); 
        console.log(err);
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

app.get("/getLogs", async function(req,res){
	ret = await mredis.getLogs();
	res.send(ret);
})

app.listen(8900, () => console.log("Example app listening on port:8900"))