import { verifyToken } from "../utils/auth.js";

// Verifies the Bearer token in the Authorization header and attaches
// req.user = { id, email } for downstream controllers to use for
// ownership checks (e.g. "only return monitors owned by req.user.id").
export const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, no token provided",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);
        req.user = { id: decoded.id, email: decoded.email };
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, invalid or expired token",
        });
    }
};
