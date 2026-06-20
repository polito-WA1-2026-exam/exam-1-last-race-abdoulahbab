export function requireAuthenticatedUser(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({
    error: "AUTHENTICATION_REQUIRED",
    message: "Login is required to access this resource.",
  });
}
