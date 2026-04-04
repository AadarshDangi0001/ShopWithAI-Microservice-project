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
       const orderId = req.params?.orderId || req.body?.orderId;

       if (!orderId) {
           return res.status(400).json({ error: "orderId is required" });
       }

       const orderResponse = await axios.get(`${process.env.ORDER_SERVICE_URL || "http://localhost:3003"}/api/orders/${orderId}`, {
           headers: token ? { Authorization: `Bearer ${token}` } : {},
       });

       const orderData = orderResponse.data?.order;
       const priceAmount = Number(
           orderData?.totalAmont?.amount ?? orderData?.totalAmount?.amount ?? orderData?.totalPrice,
       );
       const currency = orderData?.totalAmont?.currency || orderData?.totalAmount?.currency || "INR";

       if (!Number.isFinite(priceAmount) || priceAmount <= 0) {
           return res.status(422).json({ error: "Invalid order amount" });
       }

         const order = await razorpay.orders.create({
             amount: Math.round(priceAmount * 100), // Convert to paise
             currency,
             receipt: `receipt_${orderId}`,
         });

            const paymentRecord = await paymentModel.create({
                order: orderId,
                razorpayOrderId: order.id,
                user: req.user._id,
                price:{
                    amount: priceAmount,
                    currency,
                },
                status: "pending",
            });

        await publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", paymentRecord)
        await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", {
            email: req.user.email,
            orderId: orderId,
            amount: priceAmount,
            currency,
            username: req.user.username,
        })

            return res.status(201).json({
                message: "Payment order created successfully",
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
            });


   } catch (error) {
        console.error("Error creating payment:", error);

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (error.code === "ECONNREFUSED") {
                return res.status(503).json({ error: "Order service is unavailable" });
            }

            if (status === 401) {
                return res.status(401).json({ error: "Authentication required" });
            }

            if (status === 403) {
                return res.status(403).json({ error: "Forbidden: You can only pay for your own orders" });
            }

            if (status === 404) {
                return res.status(404).json({ error: "Order not found" });
            }
        }

        return res.status(500).json({ error: "Internal server error" });
   }

}


export const verifyPayment = async (req, res) => {
  const { razorpayOrderId, paymentId, signature } = req.body || {};
    const secret = process.env.RAZORPAY_KEY_SECRET;

    try {
        if (!razorpayOrderId || !paymentId || !signature) {
            return res.status(400).json({ message: "razorpayOrderId, paymentId and signature are required" });
        }

        const isValid = validatePaymentVerification(
            { order_id: razorpayOrderId, payment_id: paymentId },
            signature,
            secret,
        );

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

