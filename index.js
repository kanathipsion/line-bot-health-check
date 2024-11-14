require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

const app = express();

// ตั้งค่า LINE Bot
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// กำหนดเส้นทางหลัก (Root route)
app.get('/', (req, res) => {
  res.send('Hello! LINE Bot Server is running.');
});

// Webhook Endpoint สำหรับรับข้อความจาก LINE
app.post('/webhook', middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).end())
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

// ฟังก์ชันจัดการ Event ที่ได้รับจากผู้ใช้
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;

    // ตรวจสอบว่าข้อความตรงกับรูปแบบ "ค่าน้ำตาล XX ค่าความดัน YY" หรือไม่
    const match = userMessage.match(/ค่าน้ำตาล (\d+) ค่าความดัน (\d+)/);
    if (match) {
      const sugarLevel = parseInt(match[1], 10);
      const bloodPressure = parseInt(match[2], 10);
      
      // ประเมินสุขภาพโดยใช้ฟังก์ชัน evaluateHealth
      const advice = evaluateHealth(sugarLevel, bloodPressure);
      const replyMessage = { type: 'text', text: advice };

      // ตอบกลับผู้ใช้ตามคำแนะนำที่ได้จากการประเมิน
      return client.replyMessage(event.replyToken, replyMessage);
    } else {
      // กรณีที่ข้อความไม่ตรงตามรูปแบบที่ต้องการ (ไม่มีการตอบกลับ)
      return Promise.resolve(null);
    }
  }
  return Promise.resolve(null);
}

// ฟังก์ชันประเมินสุขภาพและให้คำแนะนำ
function evaluateHealth(sugarLevel, bloodPressure) {
  let advice = 'ผลการประเมินสุขภาพของคุณ:\n';
  let isNormal = true;

  // ตรวจสอบค่าน้ำตาลในเลือด
  if (sugarLevel > 100) {
    advice += 'ค่าน้ำตาลของคุณสูงเกินไป ควรควบคุมน้ำตาลและออกกำลังกายบ้าง\n';
    isNormal = false;
  } else if (sugarLevel < 70) {
    advice += 'ค่าน้ำตาลของคุณต่ำเกินไป ควรบริโภคอาหารที่มีน้ำตาลในปริมาณที่เหมาะสม\n';
    isNormal = false;
  } else {
    advice += 'ค่าน้ำตาลของคุณอยู่ในเกณฑ์ปกติ\n';
  }

  // ตรวจสอบค่าความดันโลหิต
  if (bloodPressure > 120) {
    advice += 'ค่าความดันของคุณสูง ควรออกกำลังกายและพบแพทย์ถ้ามีอาการป่วย\n';
    isNormal = false;
  } else if (bloodPressure < 90) {
    advice += 'ค่าความดันของคุณต่ำ ควรพักผ่อนและพบแพทย์ถ้ามีอาการเวียนหัวหรืออ่อนเพลีย\n';
    isNormal = false;
  } else {
    advice += 'ค่าความดันของคุณอยู่ในเกณฑ์ปกติ\n';
  }

  // ถ้าค่าน้ำตาลและความดันอยู่ในเกณฑ์ปกติทั้งสอง
  if (isNormal) {
    advice += 'ดีมาก! สุขภาพของคุณอยู่ในเกณฑ์ปกติ ทำดีต่อไปนะครับ/ค่ะ!';
  }

  return advice;
}

// ตั้งค่าเซิร์ฟเวอร์ให้ฟังที่พอร์ตที่ระบุ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
