import { body, validationResult } from "express-validator";

const handleValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

export const createProductValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description")
  .optional()
  .isString()
  .isLength({ max: 500 })
  .trim()
  .withMessage("Description must be a non-empty string with max length of 500 characters"),
  body("priceAmount")
    .notEmpty()
    .withMessage("priceAmount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("priceAmount must be a positive number"),
  body("priceCurrency")
    .optional()
    .isIn(["INR", "USD"])
    .withMessage("priceCurrency must be INR or USD"),
  handleValidationResult,
];
