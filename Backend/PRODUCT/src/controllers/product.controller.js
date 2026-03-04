import Product from '../model/product.model.js';
import imagekit from '../services/imagekit.service.js';

const REQUIRED_FIELDS = ['title', 'description', 'priceAmount', 'seller'];

function validateRequestBody(body) {
  const missing = REQUIRED_FIELDS.filter((field) => !body[field]);
  if (missing.length) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  if (Number.isNaN(Number(body.priceAmount))) {
    return 'priceAmount must be a valid number';
  }
  return null;
}

export async function createProduct(req, res) {
  const validationError = validateRequestBody(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (!req.files?.length) {
    return res.status(400).json({ error: 'At least one product image is required' });
  }

  try {
    const uploads = await Promise.all(
      req.files.map((file) =>
        imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
        })
      )
    );

    const images = uploads.map((upload) => ({
      url: upload.url,
      thumbnail: upload.thumbnailUrl ?? upload.thumbnail ?? upload.url,
      id: upload.fileId,
    }));

    const product = await Product.create({
      title: req.body.title,
      description: req.body.description,
      price: {
        amount: Number(req.body.priceAmount),
        currency: req.body.priceCurrency || 'INR',
      },
      seller: req.body.seller,
      images,
    });

    return res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

export async function listProducts(_req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
