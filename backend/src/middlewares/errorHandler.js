// Middleware chuẩn hóa định dạng phản hồi lỗi cho toàn bộ API PH4
function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err);

  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const errorCode = err.errorCode || (statusCode === 409 ? 'INSUFFICIENT_STOCK' : 'INTERNAL_SERVER_ERROR');

  res.status(statusCode).json({
    success: false,
    errorCode,
    message: err.message || 'Đã có lỗi xảy ra trên hệ thống.',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    errorCode: 'ROUTE_NOT_FOUND',
    message: `Đường dẫn [${req.method} ${req.originalUrl}] không tồn tại trên hệ thống PH4.`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
