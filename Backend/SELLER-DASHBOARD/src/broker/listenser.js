import { subscribeToQueue } from "./broker.js"
import userModel from "../models/user.model.js"
import productModel from "../models/product.model.js"
import orderModel from "../models/order.model.js"
import paymentModel from "../models/payment.model.js"

export default async function () {
    subscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", async (user) => {
        await userModel.create(user)
    })

    subscribeToQueue("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", async (product) => {
        await productModel.create(product)
    })

    subscribeToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", async (order) => {
        await orderModel.create(order)
    })

    subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", async (payment) => {
        await paymentModel.create(payment)
    })

    subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATE", async (payment) => {
        await paymentModel.findOneAndUpdate({ orderId: payment.orderId }, { ...payment })
    })
}