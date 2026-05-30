const whatsappService = require('../services/whatsappService');
const ResponseHelper = require('../utils/responseHelper');
const { formatPhoneNumber } = require('../utils/validator');
const logger = require('../config/logger');

class MessageController {
  /**
   * POST /api/message/send-text
   * Send a text message
   * Body: { phone: "628xxx", message: "Hello" }
   */
  async sendText(req, res, next) {
    try {
      const { phone, message } = req.body;
      const jid = formatPhoneNumber(phone);

      const result = await whatsappService.sendTextMessage(jid, message);

      return ResponseHelper.success(
        res,
        {
          messageId: result.key.id,
          to: jid,
        },
        'Text message sent successfully'
      );
    } catch (error) {
      if (error.statusCode === 503) {
        return ResponseHelper.error(res, error.message, 503);
      }
      next(error);
    }
  }

  /**
   * POST /api/message/send-image
   * Send an image message
   * Body: { phone: "628xxx", image: "https://..." or base64, caption: "optional" }
   */
  async sendImage(req, res, next) {
    try {
      const { phone, image, caption } = req.body;
      const jid = formatPhoneNumber(phone);

      const result = await whatsappService.sendImageMessage(jid, image, caption);

      return ResponseHelper.success(
        res,
        {
          messageId: result.key.id,
          to: jid,
        },
        'Image message sent successfully'
      );
    } catch (error) {
      if (error.statusCode === 503) {
        return ResponseHelper.error(res, error.message, 503);
      }
      next(error);
    }
  }

  /**
   * POST /api/message/send-document
   * Send a document
   * Body: { phone: "628xxx", document: "https://..." or base64, filename: "file.pdf", mimetype: "application/pdf" }
   */
  async sendDocument(req, res, next) {
    try {
      const { phone, document, filename, mimetype } = req.body;
      const jid = formatPhoneNumber(phone);

      const result = await whatsappService.sendDocumentMessage(jid, document, filename, mimetype);

      return ResponseHelper.success(
        res,
        {
          messageId: result.key.id,
          to: jid,
          filename,
        },
        'Document sent successfully'
      );
    } catch (error) {
      if (error.statusCode === 503) {
        return ResponseHelper.error(res, error.message, 503);
      }
      next(error);
    }
  }
}

module.exports = new MessageController();
