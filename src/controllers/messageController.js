const whatsappService = require('../services/whatsappService');
const ResponseHelper = require('../utils/responseHelper');
const { formatPhoneNumber } = require('../utils/validator');
const logger = require('../config/logger');

class MessageController {
  /**
   * Verify phone number registration on WhatsApp
   * @private
   */
  async _resolveTargetJid(res, phone) {
    const jid = formatPhoneNumber(phone);
    const check = await whatsappService.checkNumber(jid);
    if (!check.exists) {
      ResponseHelper.error(
        res,
        'Phone number is not registered on WhatsApp',
        404,
        [
          {
            field: 'phone',
            message: `Nomor ${phone} tidak terdaftar di WhatsApp`,
          },
        ]
      );
      return null;
    }
    return check.jid || jid;
  }

  /**
   * POST /api/message/check-number
   * Check if a phone number exists on WhatsApp
   * Body: { phone: "628xxx" }
   */
  async checkNumber(req, res, next) {
    try {
      const { phone } = req.body;
      const jid = formatPhoneNumber(phone);

      const check = await whatsappService.checkNumber(jid);
      if (!check.exists) {
        return ResponseHelper.error(
          res,
          'Phone number is not registered on WhatsApp',
          404,
          [
            {
              field: 'phone',
              message: `Nomor ${phone} tidak terdaftar di WhatsApp`,
            },
          ]
        );
      }

      return ResponseHelper.success(
        res,
        {
          phone,
          jid: check.jid,
          registered: true,
        },
        'Phone number is registered on WhatsApp'
      );
    } catch (error) {
      if (error.statusCode === 503) {
        return ResponseHelper.error(res, error.message, 503);
      }
      next(error);
    }
  }

  /**
   * POST /api/message/send-text
   * Send a text message
   * Body: { phone: "628xxx", message: "Hello" }
   */
  async sendText(req, res, next) {
    try {
      const { phone, message } = req.body;
      const targetJid = await this._resolveTargetJid(res, phone);
      if (!targetJid) return;

      const result = await whatsappService.sendTextMessage(targetJid, message);

      return ResponseHelper.success(
        res,
        {
          messageId: result.key.id,
          to: targetJid,
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
      const targetJid = await this._resolveTargetJid(res, phone);
      if (!targetJid) return;

      const result = await whatsappService.sendImageMessage(targetJid, image, caption);

      return ResponseHelper.success(
        res,
        {
          messageId: result.key.id,
          to: targetJid,
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
      const targetJid = await this._resolveTargetJid(res, phone);
      if (!targetJid) return;

      const result = await whatsappService.sendDocumentMessage(targetJid, document, filename, mimetype);

      return ResponseHelper.success(
        res,
        {
          messageId: result.key.id,
          to: targetJid,
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
