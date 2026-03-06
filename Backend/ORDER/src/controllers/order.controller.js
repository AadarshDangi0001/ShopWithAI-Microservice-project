import orderModel from "../models/order.model.js";
import axios from "axios";

export const createOrder = async (req, res) => {
    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
    const userId = user?._id || user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const shippingAddress = req.body?.shippingAddress || {};
        const normalizedShippingAddress = {
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode || shippingAddress.pinCode,
            country: shippingAddress.country,
        };

        const cartServiceUrl = process.env.CART_SERVICE_URL || "http://localhost:3002";
        const productServiceUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";

        // CART service identifies user from token and returns { message, cart, totals }.
        const cartResponse = await axios.get(`${cartServiceUrl}/api/cart`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const cartPayload = cartResponse.data;
        const cart = cartPayload?.cart || cartPayload;
        const cartItems = cart?.items || cart?.item || [];

        console.log("Cart data received from cart service:", cart);

        if (!cart || cartItems.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        const products = await Promise.all(
            cartItems.map(async (item) => {
                const response = await axios.get(
                    `${productServiceUrl}/api/products/${item.productId}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                );

                return response.data?.data || response.data?.product || response.data;
            }),
        );

        const unavailableItems = cartItems
            .map((item, index) => {
                const product = products[index];
                const availableStock = Number(product?.stock ?? 0);
                const requiredQty = Number(item.quantity || 0);

                if (availableStock <= 0 || availableStock < requiredQty) {
                    return {
                        productId: item.productId,
                        requested: requiredQty,
                        available: Math.max(availableStock, 0),
                    };
                }

                return null;
            })
            .filter(Boolean);

        if (unavailableItems.length > 0) {
            return res.status(409).json({
                error: "Some products are out of stock",
                unavailableItems,
            });
        }

        const pricedItems = cartItems.map((item, index) => {
            const product = products[index];

            if (!product?.price?.amount || !product?.price?.currency) {
                throw new Error(`Product pricing missing for ${item.productId}`);
            }

            return {
                product: item.productId,
                quantity: item.quantity,
                price: {
                    amount: Number(product.price.amount),
                    currency: product.price.currency,
                },
            };
        });

        const subtotal = pricedItems.reduce(
            (sum, item) => sum + item.price.amount * item.quantity,
            0,
        );
        const tax = Number((subtotal * 0.1).toFixed(2));
        const shipping = subtotal > 0 ? 50 : 0;
        const totalAmount = Number((subtotal + tax + shipping).toFixed(2));

        const order = await orderModel.create({
            user: userId,
            items: pricedItems,
            status: "pending",
            totalAmont: {
                amount: totalAmount,
                currency: pricedItems[0].price.currency,
            },
            shippingAddress: normalizedShippingAddress,
        });

        return res.status(201).json({
            message: "Order created successfully",
            order,
            pricing: { subtotal, tax, shipping, totalAmount },
        });

        

    } catch (error) {
        console.error("Error creating order:", error);

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status === 401) {
                return res.status(401).json({ error: "Authentication required" });
            }

            if (status === 404) {
                return res.status(404).json({ error: "Resource not found in downstream service" });
            }
        }

        if (error.message?.startsWith("Product pricing missing")) {
            return res.status(422).json({ error: error.message });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}