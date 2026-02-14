module.exports = (req, res, next) => {
  if (req.user.role !== "mechanic") {
    return res.status(403).json({ message: "Mechanic access only" });
  }
  next();
};
