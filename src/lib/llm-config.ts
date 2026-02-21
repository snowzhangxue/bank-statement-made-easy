export type LLMProvider = "claude" | "kimi" | "openai";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

const provider = (process.env.LLM_PROVIDER || "kimi") as LLMProvider;

function getConfig(): LLMConfig {
  switch (provider) {
    case "kimi":
      return {
        provider: "kimi",
        model: process.env.KIMI_MODEL || "kimi-k2.5",
        apiKey: process.env.KIMI_API_KEY || "",
        baseUrl: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
      };
    case "openai":
      return {
        provider: "openai",
        model: process.env.OPENAI_MODEL || "gpt-4o",
        apiKey: process.env.OPENAI_API_KEY || "",
        baseUrl: process.env.OPENAI_BASE_URL,
      };
    case "claude":
    default:
      return {
        provider: "claude",
        model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250514",
        apiKey: process.env.ANTHROPIC_API_KEY || "",
      };
  }
}

export const llmConfig = getConfig();
