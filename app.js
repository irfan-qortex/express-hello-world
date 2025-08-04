const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

const VERIFY_TOKEN = "vibecode";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Put your token in .env file

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook to handle incoming messages
app.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("Incoming:", JSON.stringify(data, null, 2));

  if (data.entry && data.entry[0].changes[0].value.messages) {
    const message = data.entry[0].changes[0].value.messages[0];
    if (message.type === "audio") {
      const mediaId = message.audio.id;
      await downloadMedia(mediaId);
    }
  }
  res.sendStatus(200);
});

// Download media function
async function downloadMedia(mediaId) {
  try {
    // Step 1: Get media URL
    const mediaInfo = await axios.get(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });

    const mediaUrl = mediaInfo.data.url;
    console.log("Media URL:", mediaUrl);

    // Step 2: Download media file
    const response = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      responseType: "arraybuffer"
    });

    const filePath = path.join(__dirname, `audio_${mediaId}.ogg`);
    fs.writeFileSync(filePath, response.data);
    console.log(`Audio saved to ${filePath}`);
  } catch (error) {
    console.error("Error downloading media:", error.response?.data || error.message);
  }
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
