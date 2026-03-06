import mongoose, { Cursor } from "mongoose";


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
    shippingAddress:{
        type: String,
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
},{
    timestamps: true
})