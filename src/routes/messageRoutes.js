const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { messageLimiter } = require('../middlewares/rateLimiter');
const { sendTextRules, sendImageRules, sendDocumentRules, handleValidation } = require('../utils/validator');

// Apply message rate limiter to all message routes
router.use(messageLimiter);

// POST /api/message/send-text
router.post(
  '/send-text',
  sendTextRules,
  handleValidation,
  (req, res, next) => messageController.sendText(req, res, next)
);

// POST /api/message/send-image
router.post(
  '/send-image',
  sendImageRules,
  handleValidation,
  (req, res, next) => messageController.sendImage(req, res, next)
);

// POST /api/message/send-document
router.post(
  '/send-document',
  sendDocumentRules,
  handleValidation,
  (req, res, next) => messageController.sendDocument(req, res, next)
);

module.exports = router;
