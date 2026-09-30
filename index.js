const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SECRET_KEY = process.env.SECRET_KEY || "OWNFLIX_123";
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.log("WARNING: BOT_TOKEN aur CHANNEL_ID .env me set karo");
}

const DB_FILE = path.join(os.tmpdir(), 'videos.json');
function loadDB(){ try{ if(!fs.existsSync(DB_FILE)) return []; return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch(e){ return []; } }
function saveDB(data){ try{ fs.writeFileSync(DB_FILE, JSON.stringify(data,null,2)); }catch(e){} }
try { fs.mkdirSync(path.join(os.tmpdir(), 'uploads'), {recursive:true}); } catch(e){}

const upload = multer({ dest: path.join(os.tmpdir(), 'uploads'), limits: { fileSize: 2000 * 1024 * 1024 } });

app.get('/', (req,res)=> res.json({status:"OwnFlix Vault Server Running", time: new Date().toISOString()}));

app.post('/upload', upload.single('video'), async (req,res)=>{
  try{
    const clientKey = req.headers['x-secret-key'] || req.body.secret;
    if(clientKey !== SECRET_KEY){ return res.status(403).json({error:"Invalid secret key"}); }
    if(!req.file){ return res.status(400).json({error:"No video file"}); }
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const form = new FormData();
    form.append('chat_id', CHANNEL_ID);
    form.append('video', fs.createReadStream(filePath), {filename: originalName});
    form.append('caption', originalName);
    const tgRes = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, form, {headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity});
    const fileId = tgRes.data.result.video.file_id;
    const getFileRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const filePathTG = getFileRes.data.result.file_path;
    const realUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePathTG}`;
    const db = loadDB();
    const entry = { id: Date.now().toString(), originalName, fileId, telegramFilePath: filePathTG, realUrl, uploadTime: new Date().toISOString() };
    db.unshift(entry);
    saveDB(db);
    try{ fs.unlinkSync(filePath); }catch{}
    res.json({success:true, video:entry});
  }catch(err){ console.error(err.response?.data || err.message); res.status(500).json({error:"Upload failed", details: err.response?.data || err.message}); }
});

app.get('/videos', (req,res)=>{
  const key = req.headers['x-secret-key'] || req.query.secret;
  if(key != SECRET_KEY) return res.status(403).json({error:"Invalid secret"});
  res.json({videos: loadDB()});
});

app.get('/stream/:fileId', async (req,res)=>{
  try{
    const fileInfo = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${req.params.fileId}`);
    res.redirect(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.data.result.file_path}`);
  }catch{ res.status(404).json({error:"File not found"}); }
});

app.listen(PORT, ()=> console.log(`OwnFlix Server running on port ${PORT}`));
module.exports = app;
