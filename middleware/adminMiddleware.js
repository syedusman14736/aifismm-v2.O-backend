const adminMiddleware = (req, res, next) => {
    try {
        // ==========================================
        // CHECK AUTHENTICATED USER
        // ==========================================

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required.",
            });
        }

        // ==========================================
        // CHECK ADMIN ROLE
        // ==========================================

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message:
                    "Admin access required.",
            });
        }

        next();
    } catch (error) {
        console.error(
            "Admin Middleware Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify admin access.",
        });
    }
};

export default adminMiddleware;