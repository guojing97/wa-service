const { body, validationResult } = require('express-validator');

/**
 * Format phone number to WhatsApp JID format
 * Input: 08123456789, 628123456789, +628123456789
 * Output: 628123456789@s.whatsapp.net
 */
function formatPhoneNumber(phone) {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Convert leading 0 to 62 (Indonesia)
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }

  // Remove leading + if exists (already cleaned but just in case)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  // Must be at least 10 digits and start with valid country code or 0
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Handle validation errors from express-validator
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
}

// Validation rules for sending text message
const sendTextRules = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    }),
  body('message').notEmpty().withMessage('Message is required').isString().withMessage('Message must be a string'),
];

// Validation rules for sending image
const sendImageRules = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    }),
  body('image').notEmpty().withMessage('Image URL or base64 is required'),
  body('caption').optional().isString().withMessage('Caption must be a string'),
];

// Validation rules for sending document
const sendDocumentRules = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    }),
  body('document').notEmpty().withMessage('Document URL or base64 is required'),
  body('filename').notEmpty().withMessage('Filename is required').isString().withMessage('Filename must be a string'),
  body('mimetype').optional().isString().withMessage('Mimetype must be a string'),
];

module.exports = {
  formatPhoneNumber,
  isValidPhone,
  handleValidation,
  sendTextRules,
  sendImageRules,
  sendDocumentRules,
};
