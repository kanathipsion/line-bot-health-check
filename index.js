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
      if (sugarLevel < 70) {
        replyMessage = 'ค่าน้ำตาลของเติ้นต่ำเกินแล้วนิ และแนะนำให้รับกินอาหารที่มีน้ำตาล ถ้าไม่ดีขึ้นก็แขบไปหาหมอได้แล้ว';
        healthStatus = 'น้ำตาลต่ำ';
      } else if (pressureLevel < 60) {
        replyMessage = 'ค่าความดันต่ำ และแนะนำให้นั่งพักและดื่มน้ำ ถ้าไม่ดีขึ้นก็แขบไปหาหมอได้แล้ว';
        healthStatus = 'ความดันต่ำ';
      } else if (sugarLevel <= 100 && pressureLevel <= 120) {
        replyMessage = 'ค่าของคุณอยู่ในเกณฑ์ปกติ ผ่าน! โปรดรักษาสุขภาพให้ดีต่อไป';
        healthStatus = 'ปกติ';
      } else if (sugarLevel > 100 && pressureLevel <= 120) {
        replyMessage = 'ค่าน้ำตาลของคุณสูงกว่าปกติ ควรออกกำลังกายและควบคุมอาหาร หากไม่ดีขึ้นควรไปพบแพทย์';
        healthStatus = 'น้ำตาลสูง';
      } else if (sugarLevel <= 100 && pressureLevel > 120) {
        replyMessage = 'ค่าความดันของคุณสูงกว่าปกติ ควรออกกำลังกายและลดอาหารเค็ม หากมีอาการผิดปกติควรไปพบแพทย์';
        healthStatus = 'ความดันสูง';
      } else if (sugarLevel > 100 && pressureLevel > 120) {
        replyMessage = 'ค่าน้ำตาลและความดันของคุณสูงกว่าปกติ แนะนำให้ออกกำลังกาย ควบคุมอาหาร และไปพบแพทย์เพื่อความปลอดภัย';
        healthStatus = 'น้ำตาลและความดันสูง';
      }

      // Include userId in the response message
      const fullReplyMessage = `ผู้ใช้: ${event.source.userId}\n${replyMessage}`;

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

      // Reply to user with userId and advice
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: fullReplyMessage,
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
