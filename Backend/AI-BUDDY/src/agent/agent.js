import 'dotenv/config';
import { StateGraph , MessagesAnnotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ToolMessage, AIMessage } from "@langchain/core/messages";
import * as tools from "./tools.js";


const model = new ChatGoogleGenerativeAI({
    temperature: 0.5,
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    apiKey: (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
});

console.log("[agent] Gemini model initialized. API key present:", Boolean((process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim()));


const graph = new StateGraph(MessagesAnnotation)
    .addNode("tools", async (state, config) => {

        const lastMessage = state.messages[ state.messages.length - 1 ]

        const toolsCall = lastMessage.tool_calls
        console.log("[agent][tools] Tool calls count:", toolsCall?.length || 0);

        const toolCallResults = await Promise.all(toolsCall.map(async (call) => {

            const tool = tools[ call.name ]
            if (!tool) {
                throw new Error(`Tool ${call.name} not found`)
            }
            const toolInput = call.args

            console.log("Invoking tool:", call.name, "with input:", call)

            const toolResult = await tool.func({ ...toolInput, token: config.metadata.token })

            return new ToolMessage({ content: toolResult, name: call.name })

        }))

        state.messages.push(...toolCallResults)

        return state
    })
    .addNode("chat", async (state, config) => {
        console.log("[agent][chat] Invoking model. Message count:", state.messages.length);
        const response = await model.invoke(state.messages, { tools: [ tools.searchProduct, tools.addProductToCart ] })
        console.log("[agent][chat] Model response received. Has tool calls:", Boolean(response?.tool_calls?.length));

        const aiContent =
            response?.content ??
            response?.text ??
            "Sorry, I could not generate a response right now.";

        console.log("[agent][chat] AI content type:", Array.isArray(aiContent) ? 'array' : typeof aiContent);

        state.messages.push(new AIMessage({ content: aiContent, tool_calls: response.tool_calls || [] }))

        return state

    })
    .addEdge("__start__", "chat")
    .addConditionalEdges("chat", async (state) => {

        const lastMessage = state.messages[ state.messages.length - 1 ]

        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            return "tools"
        } else {
            return "__end__"
        }

    })
    .addEdge("tools", "chat")



const agent = graph.compile()

export { agent };