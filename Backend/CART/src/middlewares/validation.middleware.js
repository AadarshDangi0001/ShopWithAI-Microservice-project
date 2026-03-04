import {body, validationResult} from "express-validator";
import mongoose from "mongoose";


function validationMiddleware(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

export const validateAddItemToCart = [
    body('productId')
    .isString()
    .withMessage('Product ID must be a string')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Product ID format'),
    body('qty')
    .isInt({ gt: 0 })
    .withMessage('Quantity must be an integer greater than 0'),
    
validationMiddleware,
];  