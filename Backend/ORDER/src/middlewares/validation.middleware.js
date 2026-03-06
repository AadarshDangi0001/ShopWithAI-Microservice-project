import { body, validationResult } from 'express-validator';

const respondWithValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const createOrderValidator = [  
    body('shippingAddress')
    .isObject()
    .withMessage('shippingAddress must be an object'),

    body('shippingAddress.street')
    .isString()
    .withMessage('Street must be a string')
    .notEmpty()
    .withMessage('Street is required'),

    body('shippingAddress.city')
    .isString()
    .withMessage('City must be a string')
    .notEmpty()
    .withMessage('City is required'),

    body('shippingAddress.state')
    .isString()
    .withMessage('State must be a string')
    .notEmpty()
    .withMessage('State is required'),

    body('shippingAddress')
    .custom((value) => {
        const pinCode = value?.pinCode ?? value?.pincode;

        if (typeof pinCode !== 'string' || pinCode.trim() === '') {
            throw new Error('Pin code is required');
        }

        return true;
    }),

    body('shippingAddress.country')
    .isString()
    .withMessage('Country must be a string')
    .notEmpty()
    .withMessage('Country is required'),

    

    respondWithValidationErrors
]


export  { createOrderValidator };