import Product from '../model/product.model.js';
import { uploadImage } from '../services/imagekit.service.js';

export async function createProduct(req, res) {
  if (!req.files?.length) {
    return res.status(400).json({ error: 'At least one product image is required' });
  }

  try {
    const { title, description, priceAmount, priceCurrency = 'INR' } = req.body;
    const seller = req.user?._id || req.user?.id || req.body.seller;

    if (!seller) {
      return res.status(400).json({ error: 'Seller is required' });
    }

    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency,
    };

    const images = await Promise.all((req.files || []).map(file => uploadImage(file.buffer, file.originalname)));

    const product = await Product.create({
      title,
      description,
      price,
      seller,
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
