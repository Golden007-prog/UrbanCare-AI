require('dotenv').config();
const fs = require('fs');
const path = require('path');
const hf = require('./src/ai/huggingfaceClient');

async function test() {
  const dummyBase64 = Buffer.from('test').toString('base64');
  console.log('Testing generic router...');
  try {
    process.env.MEDGEMMA_ENDPOINT = ''; // Force generic router
    const res = await hf.imageTextToText('google/medgemma-4b-it', dummyBase64, 'What is this?');
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}

test();
