// src/app.js
require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');
const { errorMiddleware } = require('./middlewares/error');
const { globalRateLimiter, authRateLimiter } = require('./middlewares/rateLimit');

const app = express();

// Sử dụng helmet và tắt CSP để Swagger UI không bị vỡ giao diện (do chặn inline CSS/JS)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());

// Áp dụng bộ giới hạn rate limit toàn cục cho tất cả các request
app.use(globalRateLimiter);

// Endpoint tài liệu API trực quan tại /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Áp dụng bộ giới hạn tần suất truy cập riêng biệt cho Auth (Login/Register)
app.use('/auth', authRateLimiter, require('./modules/auth/auth.routes'));

app.use('/users',     require('./modules/users/users.routes'));
app.use('/foods',     require('./modules/foods/foods.routes'));
app.use('/meals',     require('./modules/meals/meals.routes'));
app.use('/summary',   require('./modules/summary/summary.routes'));
app.use('/recommend', require('./modules/recommendation/recommendation.routes'));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Tastee API is running' });
});

// Global error handler – phải đặt CUỐI CÙNG
app.use(errorMiddleware);

module.exports = app;
