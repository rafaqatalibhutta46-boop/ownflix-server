// Final Storage - No Firebase, No 413 Error
let videos = []; // RAM me save hoga

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-secret-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET pe videos dikhao (Feed ke liye)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: "API is working!", 
      count: videos.length,
      videos: videos.reverse() 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, caption, username, creatorId, displayName, userAvatar, size } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl missing' });

    const newVideo = {
      id: Date.now().toString(),
      videoUrl, // Ye 5KB ka Telegram URL hai - 300MB ki video ka!
      caption: caption || "",
      username: username || "creator",
      creatorId: creatorId || "123",
      displayName: displayName || "Creator",
      userAvatar: userAvatar || "",
      size: size || 0,
      createdAt: new Date().toISOString()
    };

    videos.push(newVideo);
    console.log("Saved:", videoUrl);

    return res.status(200).json({ success: true, video: newVideo });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
