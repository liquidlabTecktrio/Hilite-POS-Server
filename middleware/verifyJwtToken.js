const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

const verifyToken = async (req, res, next) => {
  let token = req.headers.token;
  if (token == undefined || token == "") {
    return res.status(401).json({ status: 401, message: "Unauthorized" });
  }
  try {
    const verifyToken = await jwt.verify(token, process.env.JWT_SECRET);
    if (verifyToken) {
      next();
    }
  } catch (err) {
    return res.status(401).json({ status: 401, message: "Unauthorized" });
  }
};

module.exports = verifyToken;
