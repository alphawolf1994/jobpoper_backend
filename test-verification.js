const TwilioService = require('./services/twilioService');
require('dotenv').config();

// Connect to MongoDB
const mongoose = require('mongoose');

async function testVerification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test with a sample phone number (use E.164 format)
    const testPhoneNumber = '+923001234567'; // Pakistan number format

    
    console.log('\n🔍 Testing sendVerificationCode...');
    console.log('Phone Number:', testPhoneNumber);
    console.log('Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('Twilio Service ID:', process.env.TWILIO_SERVICE_ID);
    
    const result = await TwilioService.sendVerificationCode(testPhoneNumber);
    
    console.log('\n✅ Success!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n📤 Disconnected from MongoDB');
    process.exit(0);
  }
}

testVerification();
