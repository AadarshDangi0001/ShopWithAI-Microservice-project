import mongoose from 'mongoose';
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

export async function getProducts(req, res) {
  try {
    const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

    const filter = {};
    if (q) {
      filter.$text = { $search: q };
    }

    if (minprice || maxprice) {
      filter['price.amount'] = {};
      if (minprice) filter['price.amount'].$gte = Number(minprice);
      if (maxprice) filter['price.amount'].$lte = Number(maxprice);
    }

    const normalizedSkip = Math.max(Number(skip) || 0, 0);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const products = await Product.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip(normalizedSkip)
      .limit(normalizedLimit);

    return res.status(200).json({
      message: 'Products fetched successfully',
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products list:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

export async function getProductById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product fetched successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
}

export async function updateProduct(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid product id' });
    }

    try {
    const requesterId = req.user?._id?.toString() || req.user?.id?.toString();

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.seller.toString() !== requesterId) {
      return res.status(403).json({ error: 'Forbidden: you cannot modify this product' });
    }

    const allowedUpdates = ['title', 'description', 'price'];
    for (const key of allowedUpdates) {
      if (!Object.prototype.hasOwnProperty.call(req.body, key)) {
        continue;
      }

      if (key === 'price' && typeof req.body.price === 'object') {
        if (req.body.price.amount !== undefined) {
          product.price.amount = Number(req.body.price.amount);
        }
        if (req.body.price.currency) {
          product.price.currency = req.body.price.currency;
        }
        continue;
      }

      product[key] = req.body[key];
    }

    await product.save();

    return res.status(200).json({
      message: 'Product updated successfully',
      data: product,
    });

    } catch (error) {   
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Failed to update product' });
    }

}