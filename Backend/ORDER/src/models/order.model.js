import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({ 
    street: {
        type: String,
       
    },
    city: {
        type: String,
      
    },
    state: {
        type: String,
       
    },
    pincode: {
        type: String,
       
    },
    country: {
        type: String,
        
    }
})  

const orderSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    items:[
        {
            product:{
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            
            },
            quantity:{
                type: Number,
                min: 1,
                default: 1
            },
            price:{
                amount:{
                    type: Number,
                    required: true
                },
                currency:{
                    type: String,
                    required: true,
                    enum: ['USD',  'INR']
                }
            }
        }
    ],
    status:{
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    totalAmont:{
        amount:{
            type: Number,
            required: true
        },
        currency:{
            type: String,
            required: true,
            enum: ['USD',  'INR']
        }
    },
    shippingAddress: {
        type:addressSchema,
        required: true

    },
    createdAt:{
        type: Date,
        default: Date.now
    }
},{
    timestamps: true
})


const orderModel = mongoose.model('order', orderSchema);

export default orderModel;