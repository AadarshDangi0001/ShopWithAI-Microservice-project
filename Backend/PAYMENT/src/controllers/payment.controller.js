import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import paymentModel from "../models/payment.model.js";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";

import { publishToQueue } from "../broker/borker.js";

import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export const createPayment = async (req, res) => {

    const token =  req.cookies?.token || req.headers?.authorization?.split(' ')[1];


   try {
       const  orderId  = req.body.orderId;
       const orderResponse = await axios.get(`${process.env.ORDER_SERVICE_URL || "http://localhost:3003"}/api/orders/${orderId}`, {
           headers: token ? { Authorization: `Bearer ${token}` } : {},
       });

       const price =  orderResponse.data.order.totalPrice;

         const order = await razorpay.orders.create({
             amount: price * 100, // Convert to paise
             currency: "INR",
             receipt: `receipt_${orderId}`,
         });

            const paymentRecord = await paymentModel.create({
                order: orderId,
                razorpayOrderId: order.id,
                user: req.user._id,
                price:{
                    amount: price,
                    currency: "INR"
                },
                status: "created",
            });

            return res.status(201).json({
                message: "Payment order created successfully",
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
            });


   } catch (error) {
        console.error("Error creating payment:", error);
        return res.status(500).json({ error: "Internal server error" });
   }

}


export const verifyPayment = async (req, res) => {
  const { razorpayOrderId, paymentId, signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    try {
        const isValid = validatePaymentVerification({ razorpayOrderId, paymentId }, signature, secret);

        if (!isValid) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

         const payment = await paymentModel.findOne({ razorpayOrderId, status: 'pending' });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.paymentId = paymentId;
        payment.signature = signature;
        payment.status = 'completed';

        await payment.save();

        await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_VERIFIED", {
            orderId: payment.order,
            paymentId: payment.paymentId,
            userId: payment.user,
            amount: payment.price.amount,
            currency: payment.price.currency,
            fullName: req.user.fullName,
        });

        res.status(200).json({ message: "Payment verified successfully" });
       
        
    } catch (err) {
        
         console.log(err);
         
         await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
             email: req.user.email,
             paymentId: paymentId,
             orderId: razorpayOrderId
           
        });
         
        return res.status(500).json({ message: 'Internal Server Error' });

    }
}

