import { prisma } from "../config/db.js";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";
import { registerSchema, loginSchema } from "../utils/schemaValidation.js";

export const register = async (req, res) => {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: result.error.issues[0]?.message || "Invalid input",
        });
    }

    const { email, password, name } = result.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists",
            });
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });

        const token = generateToken({ id: user.id, email: user.email });

        return res.status(201).json({
            success: true,
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (error) {
        console.log("error registering user", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: result.error.issues[0]?.message || "Invalid input",
        });
    }

    const { email, password } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken({ id: user.id, email: user.email });

        return res.status(200).json({
            success: true,
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (error) {
        console.log("error logging in user", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Returns the currently authenticated user, useful for the frontend to
// validate a stored token on app load.
export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.log("error fetching current user", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
