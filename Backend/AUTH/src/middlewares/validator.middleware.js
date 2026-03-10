import {body, validationResult} from 'express-validator';


const respondWithValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const registerUserValidator = [
    body('username')
    .isString()
    .withMessage('Username must be a string')
    .notEmpty()
    .withMessage('Username is required') 
    .isLength({min:3, max:30})
    .withMessage('Username must be between 3 and 30 characters'),

    body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .notEmpty()
    .withMessage('Email is required'),

    body('password')
    .isString()
    .withMessage('Password must be a string')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({min:8})
    .withMessage('Password must be at least 8 characters long'),

    body('fullName.firstName')
    .isString()
    .withMessage('First name must be a string')
    .notEmpty()
    .withMessage('First name is required'),

    body('fullName.lastName')
    .isString()
    .withMessage('Last name must be a string')
    .notEmpty()
    .withMessage('Last name is required'),

    body('role')
    .optional()
    .isIn(['user', 'seller'])
    .withMessage('Role must be either user or seller'),

    respondWithValidationErrors
];

const loginUserValidator = [
    body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),

    body('username')
    .optional()
    .isString()
    .withMessage('Username must be a string')
    .notEmpty()
    .withMessage('Username is required'),

    body('password')
    .isString()
    .withMessage('Password must be a string')
    .notEmpty()
    .withMessage('Password is required'),

    body()
    .custom((value) => {
        if (!value.email && !value.username) {
            throw new Error('Either email or username is required');
        }
        return true;r
    }),

    respondWithValidationErrors
];


const addUserAddressValidator = [  
    body('street')
    .isString()
    .withMessage('Street must be a string')
    .notEmpty()
    .withMessage('Street is required'),

    body('city')
    .isString()
    .withMessage('City must be a string')
    .notEmpty()
    .withMessage('City is required'),

    body('state')
    .isString()
    .withMessage('State must be a string')
    .notEmpty()
    .withMessage('State is required'),

    body('pinCode')
    .isString()
    .withMessage('Pin code must be a string')
    .notEmpty()
    .withMessage('Pin code is required'),

    body('country')
    .isString()
    .withMessage('Country must be a string')
    .notEmpty()
    .withMessage('Country is required'),

    body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean'),

    

    respondWithValidationErrors
]

export { registerUserValidator, loginUserValidator , addUserAddressValidator };

