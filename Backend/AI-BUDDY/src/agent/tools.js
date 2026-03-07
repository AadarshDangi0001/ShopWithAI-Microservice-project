import {tool} from 'langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';

const searchProject = tool(async({query, token})=>{

   const response = await axios.get(`http://localhost:3001/api/projects?q=${data.query}`,{
    headers: token ? { Authorization: `Bearer ${token}` } : {},
   });

   return JSON.stringify(response.data);

}
,{
    
    name:"searchProject",
    description:"Search for a project by name or description",
    inputSchema: z.object({
        query: z.string().describe("The search query for the project")
    })

})

const addProductToCart = tool(async({ productId, qty = 1,token})=>{

    const response = await axios.post(`http://localhost:3002/api/cart`,{
        productId,
        qty
    },{
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return JSON.stringify(response.data);

}
,{
    
    name:"addProductToCart",
    description:"Add a product to the cart by product ID",
    inputSchema: z.object({
        productId: z.string().describe("The ID of the product to add to the cart"),
        qty: z.number().describe("The quantity of the product to add to the cart").default(1)
    })

})

export {searchProject,addProductToCart};