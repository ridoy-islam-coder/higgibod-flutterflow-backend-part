import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { startupLogger } from './app/utils/startupLogger';


const port = Number(config.port) || 5001;

const startServer = async () => {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('Database connected');

    app.listen(port, () => {
     startupLogger(Number(port));
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: any) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});