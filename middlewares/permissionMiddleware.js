const authorizeRole = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient role" });
    }
    next();
  };
};

const authorizePermission = (permission) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !user.includes(permission)) {
      return res
        .status(403)
        .json({ message: "Access denied: Missing permission" });
    }
    next();
  };
};

export default { authorizeRole, authorizePermission };
