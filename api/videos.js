// Feed API - Final Fixed
let videos = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-secret-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      status: "API is working!",
      message: "Feed is ready!",
      count: videos.length,
      videos: [...videos].reverse()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, caption, username } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl missing' });

    const newVideo = {
      id: Date.now().toString(),
      videoUrl,
      caption: caption || "",
      username: username || "creator",
      createdAt: new Date().toISOString()
    };

    videos.push(newVideo);
    return res.status(200).json({ success: true, video: newVideo });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
