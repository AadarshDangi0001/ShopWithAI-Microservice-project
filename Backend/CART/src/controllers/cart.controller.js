import { cartModel } from "../models/car.model";


export const addItemToCart = async (req, res) => {
   const { productId, qty } = req.body;
   const user = req.user;

   let cart = await cartModel.findOne({ user: user._id });

   if (!cart) {
      cart = new cartModel({
         user: user._id,
         item: [{ productId, quantity: qty }],
      });
   } else {
      const existingItemIndex = cart.item.findIndex((item) => item.productId === productId);

      if (existingItemIndex !== -1) {
         cart.item[existingItemIndex].quantity += qty;
      } else {
         cart.item.push({ productId, quantity: qty });
      }
   }

   await cart.save();

   res.status(201).json({ message: 'Item added to cart successfully', cart });

}