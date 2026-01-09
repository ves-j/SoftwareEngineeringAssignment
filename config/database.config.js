const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async (retries = 5) => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/victoria-hall';

  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 45000,
      });

      isConnected = true;
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn.connection;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed: ${error.message}`);

      if (attempt === retries) throw error;

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
