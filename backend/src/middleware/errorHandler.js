import { AppError } from '../utils/errors.js';

export function errorHandler(err, req, res, _next) {
    console.error('Error:', err.message);
    if (!err.isOperational) console.error(err.stack);

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Postgres unique violation
    if (err.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'A record with this value already exists',
        });
    }

    // Postgres foreign key violation
    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Referenced record does not exist',
        });
    }

    // Database unavailable or required schema missing.
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '28P01', '3D000', '42P01', '42703'].includes(err.code)) {
        return res.status(503).json({
            success: false,
            message: 'Database is not ready. Check DATABASE_URL and run migrations.',
        });
    }

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 2MB',
        });
    }

    // Default server error
    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
    });
}
