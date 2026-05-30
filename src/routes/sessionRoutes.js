const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// GET /api/session/status — Check connection status
router.get('/status', (req, res, next) => sessionController.getStatus(req, res, next));

// GET /api/session/qr — Get QR code
router.get('/qr', (req, res, next) => sessionController.getQR(req, res, next));

// POST /api/session/logout — Logout and clear session
router.post('/logout', (req, res, next) => sessionController.logout(req, res, next));

// POST /api/session/restart — Restart connection
router.post('/restart', (req, res, next) => sessionController.restart(req, res, next));

module.exports = router;
