const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const app = express();

// LINE Bot configurations
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Google Apps Script URL
const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

// Initialize LINE SDK client
const client = new Client(config);

// Webhook handling
app.post('/webhook', middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => res.status(500).end());
});

// Function to handle LINE messages
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;

    // Extract values from message (example: "ค่าน้ำตาล 90 ค่าความดัน 110")
    const sugarMatch = userMessage.match(/ค่าน้ำตาล\s*(\d+)/);
    const pressureMatch = userMessage.match(/ค่าความดัน\s*(\d+)/);

    if (sugarMatch && pressureMatch) {
      const sugarLevel = parseInt(sugarMatch[1]);
      const pressureLevel = parseInt(pressureMatch[1]);

      let replyMessage;
      let healthStatus;

      // Conditions for responses
      if (sugarLevel <= 100 && pressureLevel <= 120) {
        replyMessage = 'ค่าของเติ้นอยู่ในเกณฑ์ปกติ ผ่านๆ! โปรดรักษาสุขภาพให้ดีต่อไป';
        healthStatus = 'ปกติ';
      } else if (sugarLevel > 100 && pressureLevel <= 120) {
        replyMessage = 'ค่าน้ำตาลของเติ้นสูงหว่าปกติจังนิ ออกกำลังกายควบคุมอาหารมั้งได้และตะ ถ้าไม่ดีขึ้นควรไปหาหมอนะ';
        healthStatus = 'น้ำตาลสูง';
      } else if (sugarLevel <= 100 && pressureLevel > 120) {
        replyMessage = 'ค่าความดันของคุณสูงเกินแล้วนิ ควรออกกำลังกายแล้วก็ลดอาหารเค็มมั้งได้แล้ว ถ้ามีอาการผิดปกติหรือควรไปหาหมอนะ';
        healthStatus = 'ความดันสูง';
      } else if (sugarLevel > 100 && pressureLevel > 120) {
        replyMessage = 'ค่าน้ำตาลแล้วก็ค่าความดันของคุณสูงหว่าปกติจังแล้วนิ แนะนำให้ออกกำลังกายมั้งนะเติ้น ควบคุมอาหาร และไปหาหมอเพื่อตรวจสอบเพิ่มเติมกันได้ปลอดภัย';
        healthStatus = 'น้ำตาลและความดันสูง';
      }

      // Send data to Google Sheets
      axios.post(googleScriptUrl, {
        userId: event.source.userId,
        sugarLevel: sugarLevel,
        pressureLevel: pressureLevel,
        healthStatus: healthStatus,
        advice: replyMessage,
      }).then(() => {
        console.log('Data sent to Google Sheets');
      }).catch(error => {
        console.error('Error sending data to Google Sheets:', error);
      });

      // Reply to user
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyMessage,
      });
    } else {
      // Message format error
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาพิมพ์ข้อมูลในรูปแบบ: "ค่าน้ำตาล XX ค่าความดัน YY" (เช่น "ค่าน้ำตาล 90 ค่าความดัน 120")',
      });
    }
  }
  return Promise.resolve(null);
}

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
