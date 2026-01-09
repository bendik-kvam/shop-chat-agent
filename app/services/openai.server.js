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
import { agentToolRawItemToToolUsage } from "./tooUseHelper";
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
      // Unwrap if someone stored the whole tool message inside content
      let tool_call_id = m.tool_call_id;
      let content = m.content;
      let name = m.name;

      // Case A: content is already an object { role:"tool", tool_call_id, content }
      if (content && typeof content === "object" && !Array.isArray(content)) {
        if (content.role === "tool" && content.tool_call_id) {
          tool_call_id = tool_call_id ?? content.tool_call_id;
          name = name ?? content.name;
          content = content.content; // <-- unwrap to output only
        }
      }

      // Case B: content is a stringified tool message JSON
      if (typeof content === "string") {
        try {
          const parsed = JSON.parse(content);
          if (parsed?.role === "tool" && parsed?.tool_call_id) {
            tool_call_id = tool_call_id ?? parsed.tool_call_id;
            name = name ?? parsed.name;
            content = parsed.content; // <-- unwrap to output only
          }
        } catch {
          // ignore parse errors; treat as normal tool output
        }
      }

      // Final normalize: tool content must be a string (tool output),
      // and tool_call_id must be present at top-level.
      const outputText =
        typeof content === "string" ? content : JSON.stringify(content ?? {});

      return {
        role: "tool",
        tool_call_id, // IMPORTANT
        ...(name ? { name } : {}),
        content: outputText,
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
  const runAgent = async (
    { messages },
    streamHandlers,
    conversationHistory,
  ) => {
    const replayable = messages.filter((m) => m.role !== "tool");
    const normalized = normalizeMessagesForAgents(replayable);

    console.log("Normalized input:", normalized);

    const s = await run(agent, normalized, { stream: true });

    for await (const event of s) {
      if (event.name === "tool_called") {
        const raw = event.item?.rawItem;
        // IMPORTANT: tool_call_id for the "tool" message must match the call id
        const toolUseId = raw?.id;
        const toolName = raw?.providerData?.name || "unknown_tool";

        const toolUsage = agentToolRawItemToToolUsage(raw);
        if (toolUsage.error) {
          await toolService.handleToolError(
            toolUsage,
            toolName,
            toolUseId,
            normalized,
            stream.sendMessage,
            conversationId,
          );
        } else {
          await toolService.handleToolSuccess(
            toolUsage,
            toolName,
            toolUseId,
            normalized,
            productsToDisplay,
            conversationId,
          );
        }

        continue;
      }
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
