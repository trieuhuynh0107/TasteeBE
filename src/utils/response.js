// src/utils/response.js
const sendSuccess = (res, data, statusCode = 200, message = 'OK') => {
  res.status(statusCode).json({ success: true, data, message });
};

const sendPaginated = (res, data, { page, limit, total }) => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

const sendError = (res, statusCode, code, message) => {
  res.status(statusCode).json({ success: false, error: { code, message } });
};

module.exports = { sendSuccess, sendPaginated, sendError };
