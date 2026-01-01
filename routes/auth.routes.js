const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth.middleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get('/me', auth, authController.getMe);
router.patch('/update-me', auth, authController.updateMe);
router.patch('/update-password', auth, authController.updatePassword);
router.get('/profile', auth, authController.getMe)

module.exports = router;