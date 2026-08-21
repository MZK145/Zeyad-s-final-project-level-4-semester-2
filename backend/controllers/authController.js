const authService = require('../services/authService');

async function signup(req, res, next) { try { res.status(201).json(await authService.signup(req.body)); } catch (error) { next(error); } }
async function login(req, res, next) { try { res.json(await authService.login(req.body)); } catch (error) { next(error); } }
module.exports = { signup, login };
