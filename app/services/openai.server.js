//import { OpenAI } from "openai/client.js";
import systemPrompts from "../prompts/prompts.json";
import AppConfig from "./config.server";
import {
  Agent,
  tool,
  run,
  setDefaultOpenAIKey,
  hostedMcpTool,
} from "@openai/agents";
import { z } from "zod";
function toInputTextArray(content) {
  // Already in the array form the adapter expects
  if (Array.isArray(content)) return content;

  // String -> wrap as input_text
  if (typeof content === "string") {
    return [{ type: "input_text", text: content }];
  }

  // Null/undefined -> empty
  if (content == null) return [];

  // Anything else (object/number/etc) -> stringify
  return [{ type: "input_text", text: JSON.stringify(content) }];
}
function normalizeMessagesForAgents(messages) {
  return messages.map((m) => {
    const text =
      typeof m.content === "string"
        ? m.content
        : m.content == null
          ? ""
          : Array.isArray(m.content)
            ? m.content.map((c) => c?.text ?? "").join("")
            : JSON.stringify(m.content);

    if (m.role === "user") {
      return { role: "user", content: [{ type: "input_text", text }] };
    }

    if (m.role === "assistant") {
      // key change: assistant content becomes an ARRAY too
      return { role: "assistant", content: [{ type: "output_text", text }] };
    }

    if (m.role === "tool") {
      // tool messages: keep as-is (usually required by runner)
      return {
        ...m,
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      };
    }

    return { ...m, content: text };
  });
}

export const createAgent = ({
  mcpClient,
  tools: mcpToolDescriptors,
  promptType,
  toolService,
  stream,
  conversationId,
  productsToDisplay,
}) => {
  const getSystemPrompt = (promptType) => {
    return (
      systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content
    );
  };
  const systemInstruction = getSystemPrompt(promptType);

  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);

  const agentTools = mcpToolDescriptors.map((t) =>
    tool({
      name: t.name,
      description: t.description,
      strict: false, // ✅ key line :contentReference[oaicite:1]{index=1}

      parameters: t.input_schema,
      execute: async (input) => {
        // Optional: notify UI that a tool is being called
        stream?.sendMessage?.({
          type: "tool_use",
          tool_use_message: `Calling tool: ${t.name} with arguments: ${JSON.stringify(input)}`,
        });

        const res = await mcpClient.callTool(t.name, input);

        // Optional: reuse your existing success/error handlers
        if (res?.error) {
          await toolService?.handleToolError?.(
            res,
            t.name,
            "tool_call_id_unavailable_here",
            [], // conversationHistory not needed if you handle tool loop inside Agents
            stream?.sendMessage,
            conversationId,
          );
          return typeof res.error.data === "string"
            ? res.error.data
            : JSON.stringify(res.error.data);
        } else {
          // product parsing
          if (
            t.name === AppConfig.tools.productSearchName &&
            productsToDisplay
          ) {
            productsToDisplay.push(
              ...toolService.processProductSearchResult(res),
            );
          }
          return typeof res === "string" ? res : JSON.stringify(res);
        }
      },
    }),
  );

  const agent = new Agent({
    name: "Store agent",
    instructions: systemInstruction,
    tools: [
      hostedMcpTool({
        serverLabel: "storefront_mcp",
        serverUrl: mcpClient.storefrontMcpEndpoint,
      }),
    ],
  });
  const runAgent = async ({ messages }, streamHandlers) => {
    const normalized = normalizeMessagesForAgents(messages);
    console.log(normalized);
    const s = await run(agent, normalized, { stream: true });

    for await (const event of s) {
      console.log("Stream event:", event);
      if (
        event.type === "raw_model_stream_event" &&
        (event.data?.type === "output_text_delta" ||
          event.data?.type === "output_text.delta")
      ) {
        streamHandlers?.onText?.(event.data.delta);
      }
    }

    await s.completed;

    const finalText = s.finalOutput;
    streamHandlers?.onMessage?.({ role: "assistant", content: finalText });

    return { role: "assistant", content: finalText };
  };

  return { runAgent };
};
