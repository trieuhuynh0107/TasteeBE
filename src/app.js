// src/app.js
require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const { errorMiddleware } = require('./middlewares/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes will be added in subsequent phases
app.use('/auth',      require('./modules/auth/auth.routes'));
app.use('/users',     require('./modules/users/users.routes'));
app.use('/foods',     require('./modules/foods/foods.routes'));
app.use('/meals',     require('./modules/meals/meals.routes'));
app.use('/summary',   require('./modules/summary/summary.routes'));
// app.use('/recommend', require('./modules/recommendation/recommendation.routes'));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Tastee API is running' });
});

// Global error handler – phải đặt CUỐI CÙNG
app.use(errorMiddleware);

module.exports = app;
