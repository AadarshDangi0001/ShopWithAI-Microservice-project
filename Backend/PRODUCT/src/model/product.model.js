import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
},
  description: { 
    type: String, 
    required: true 
},
  price: { 
    amount:{
        type: Number,
        required: true
    },
    currency: {
        type: String,
        enum : ['USD', 'INR'],
        default: 'INR'
    }
},
seller: { 
    type: mongoose.Schema.Types.ObjectId,  
    required: true 
},

//   category: { 
//     type: String, 
//     required: true 
// },
  stock: { 
    type: Number, 
    default: 0
},
  images: [{ 
    url: String,
    thumbnail: String,
    id: String
 }],
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

export default Product;