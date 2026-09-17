require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const connectDatabase = require('./config/db');
const memberRoutes = require('./routes/memberRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;
  return res.status(isDatabaseReady ? 200 : 503).json({
    status: isDatabaseReady ? 'ok' : 'degraded',
    database: isDatabaseReady ? 'connected' : 'disconnected',
  });
});
app.use('/api/members', memberRoutes);
app.use('/api/members', rewardRoutes);
app.use(errorHandler);

async function startServer() {
  await connectDatabase();
  app.listen(port, () => console.log(`Café Rewards server listening on port ${port}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  });
}

module.exports = app;