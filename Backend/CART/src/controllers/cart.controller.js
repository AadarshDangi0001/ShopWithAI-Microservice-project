import { cartModel } from "../models/car.model.js";

const getUserId = (user) => user?._id || user?.id;


export const addItemToCart = async (req, res) => {
   const { productId, qty } = req.body;
   const user = req.user;
   const userId = getUserId(user);

   if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
   }

   let cart = await cartModel.findOne({ user: userId });

   if (!cart) {
      cart = new cartModel({
         user: userId,
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

export const updateItemQuanity = async (req, res) => {
   const { productId } = req.params;
   const { qty } = req.body;
   const user = req.user;
   const userId = getUserId(user);

   if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
   }
   
   let cart = await cartModel.findOne({ user: userId });

   if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
   }
   
   const existingItemIndex = cart.item.findIndex((item) => item.productId === productId); 

   if (existingItemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
   }

   cart.item[existingItemIndex].quantity = qty;
   await cart.save();

   res.status(200).json({ message: 'Item quantity updated successfully', cart });
}


export const getCart = async (req, res) => {
   const user = req.user;
   const userId = getUserId(user);

   if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
   }

   let cart = await cartModel.findOne({ user: userId });

   if (!cart) {
       cart = new cartModel({
           user: userId,
            items: [],
       });

         if (!Array.isArray(cart.item)) {
            cart.item = [];
         }

       await cart.save();
   }

   const items = cart.item || [];

   res.status(200).json({ 
      message: 'Cart fetched successfully', 
      cart,
      totals:{
         itemCount: items.length,
         totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      }
   });

}


export const deleteItemFromCart = async (req, res) => {
   const { productId } = req.params;
   const user = req.user;
   const userId = getUserId(user);

   if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
   }

   let cart = await cartModel.findOne({ user: userId });

   if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
   }

   cart.item = cart.item.filter((item) => item.productId !== productId);
   await cart.save();

   res.status(200).json({ message: 'Item removed from cart successfully', cart });
}

export const clearCart = async (req, res) => {
   const user = req.user;
   const userId = getUserId(user);

   if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
   }

   let cart = await cartModel.findOne({ user: userId });

   if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
   }

   cart.item = [];
   await cart.save();

   res.status(200).json({ message: 'Cart cleared successfully', cart });
}