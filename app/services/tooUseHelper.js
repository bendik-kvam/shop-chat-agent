function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Converts OpenAI Agents tool_called item/rawItem into your toolUsage format:
 *  - success: { content: [{ text: string }] }
 *  - error:   { error: { type, data } }
 */
export function agentToolRawItemToToolUsage(rawItem) {
  const status = rawItem?.status;
  const output = rawItem?.output;

  // Agents: treat failed/cancelled as error; completed as success
  const isError =
    status === "failed" || status === "error" || status === "cancelled";

  if (isError) {
    // best-effort error extraction
    const data =
      typeof output === "string"
        ? (safeJsonParse(output) ?? output)
        : (output ?? rawItem?.error ?? { status });

    return {
      error: {
        // map to your existing types; auth_required can be detected if your MCP provides it
        type: data?.type || "tool_error",
        data,
      },
    };
  }

  // SUCCESS path
  let text;

  if (typeof output === "string") {
    // keep as string; your product parser can JSON.parse it
    text = output;
  } else {
    text = JSON.stringify(output ?? {});
  }

  return {
    content: [{ text }],
  };
}
