
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIG - ENV se aayega, code me hardcoded nahi ---
const BOT_TOKEN = process.env.BOT_TOKEN; // BotFather token
const CHANNEL_ID = process.env.CHANNEL_ID; // -1003946763183
const SECRET_KEY = process.env.SECRET_KEY || "OWNFLIX_123";
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.log("WARNING: BOT_TOKEN aur CHANNEL_ID .env me set karo");
}

// Simple JSON DB - Render pe file system temporary hai, lekin kaam chalega
// Better: isko aap free me Supabase ya json file pe shift kar sakte ho
const DB_FILE = path.join(__dirname, 'videos.json');
function loadDB(){ try{ return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch(e){ return []; } }
function saveDB(data){ fs.writeFileSync(DB_FILE, JSON.stringify(data,null,2)); }

const upload = multer({ dest: 'uploads/', limits: { fileSize: 2000 * 1024 * 1024 } }); // 2GB tak

// Health check
app.get('/', (req,res)=> res.json({status:"OwnFlix Vault Server Running", time: new Date().toISOString()}));

// 1. UPLOAD ENDPOINT - Isko aap apni Movie App me lagao ge
// TikTok jaisa private - Sirf SECRET_KEY wale upload kar sakte hain
app.post('/upload', upload.single('video'), async (req,res)=>{
  try{
    const clientKey = req.headers['x-secret-key'] || req.body.secret;
    if(clientKey !== SECRET_KEY){
      return res.status(403).json({error:"Invalid secret key"});
    }
    if(!req.file){
      return res.status(400).json({error:"No video file"});
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Telegram pe bhejo - Bot API sendVideo
    const form = new FormData();
    form.append('chat_id', CHANNEL_ID);
    form.append('video', fs.createReadStream(filePath), {filename: originalName});
    form.append('caption', `New Upload: ${originalName} | ${new Date().toISOString()}`);

    const tgRes = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // Telegram file_id nikalo
    const fileId = tgRes.data.result.video.file_id;
    const fileUniqueId = tgRes.data.result.video.file_unique_id;

    // Telegram getFile se real streaming URL lo
    const getFileRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const filePathTG = getFileRes.data.result.file_path;
    const realUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePathTG}`;

    // DB me save karo
    const db = loadDB();
    const entry = {
      id: Date.now().toString(),
      originalName,
      fileId,
      fileUniqueId,
      telegramFilePath: filePathTG,
      realUrl: realUrl, // Yehi asli URL hai - ye fake ownflix-vault.app wala nahi
      uploadTime: new Date().toISOString()
    };
    db.unshift(entry);
    saveDB(db);

    // temp file delete
    fs.unlinkSync(filePath);

    res.json({success:true, video: entry, message:"Video aapke Private Vault tak pahunch gayi"});

  }catch(err){
    console.error(err.response?.data || err.message);
    res.status(500).json({error: "Upload failed", details: err.response?.data || err.message});
  }
});

// 2. VIDEOS LIST ENDPOINT - Isko aapka Vault App har 5 sec poll karega (Inventory 0->1)
app.get('/videos', (req,res)=>{
  const key = req.headers['x-secret-key'] || req.query.secret;
  if(key !== SECRET_KEY){
    return res.status(403).json({error:"Invalid secret"});
  }
  const db = loadDB();
  res.json({videos: db});
});

// 3. STREAM PROXY - Agar direct Telegram URL expire ho to is se chalao
app.get('/stream/:fileId', async (req,res)=>{
  try{
    const fileId = req.params.fileId;
    const getFileRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const filePathTG = getFileRes.data.result.file_path;
    const realUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePathTG}`;
    // Redirect to real Telegram file
    res.redirect(realUrl);
  }catch(e){
    res.status(404).json({error:"File not found"});
  }
});

app.listen(PORT, ()=> console.log(`OwnFlix Server running on port ${PORT}`));
