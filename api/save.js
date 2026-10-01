export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: "API is working!", message: "Link theek hai!" });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }
  try {
    const { videoUrl, caption } = req.body;
    if (!videoUrl) return res.status(400).json({error: 'videoUrl missing'});
    console.log("Saved URL:", videoUrl);
    return res.status(200).json({ success: true, url: videoUrl });
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
}
