module.exports = (req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Owner access only" });
  }
  next();
};
