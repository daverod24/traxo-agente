import type { ProductCategory } from "@traxo/db";
import type { z } from "zod";
import { env } from "./env.ts";
import { redactPii } from "./security.ts";
import {
  checkCategoryGuardrails,
  sanitizeCategoryContent,
} from "./services/marketing-generator.ts";

export type AiProviderName = "gemini" | "grok" | "openrouter" | "claude" | "deterministic";

export interface CascadeExecutionParams<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  category?: ProductCategory | string;
  deterministicFallback: () => T;
}

export interface CascadeResult<T> {
  data: T;
  provider: AiProviderName;
  model: string;
  latencyMs: number;
}

/**
 * Limpia delimitadores markdown (```json ... ```) si el modelo los incluye.
 */
export function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Inferencia pura con fetch nativo (Cero SDKs pesados) con cascada resiliente:
 * 1. Gemini (gemini-2.5-flash, thinkingBudget: 0, x-goog-api-key) [8000ms]
 * 2. Grok / xAI (grok-2-mini, json_object) [8000ms]
 * 3. OpenRouter o Claude / Anthropic [8000ms]
 * 4. Fallback Determinista Local Firmado [~2ms]
 */
export async function executeAiCascade<T>(
  params: CascadeExecutionParams<T>,
): Promise<CascadeResult<T>> {
  const { systemPrompt, userPrompt, schema, category, deterministicFallback } = params;

  // -------------------------------------------------------------------------
  // 1. GEMINI (Google AI Studio)
  // -------------------------------------------------------------------------
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== "") {
    const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsedJson = JSON.parse(cleanJsonText(rawText));

          // Validación Zod estricta
          const validation = schema.safeParse(parsedJson);
          if (validation.success) {
            let finalData = validation.data;

            // Validación de Guardrails de Categoría
            if (category) {
              const guardrail = checkCategoryGuardrails(JSON.stringify(finalData), category);
              if (!guardrail.ok) {
                console.warn(
                  `⚠️ Gemini violó guardrail de categoría (${category}): ${guardrail.violatedTerms.join(", ")}. Sanitizando...`,
                );
                const sanitizedStr = sanitizeCategoryContent(JSON.stringify(finalData), category);
                const secondCheck = schema.safeParse(JSON.parse(sanitizedStr));
                if (secondCheck.success) {
                  finalData = secondCheck.data;
                }
              }
            }

            return {
              data: finalData,
              provider: "gemini",
              model,
              latencyMs: Date.now() - start,
            };
          } else {
            console.warn(
              "⚠️ Gemini retornó JSON que no cumplió el esquema Zod:",
              validation.error.issues,
            );
          }
        }
      } else {
        const errorText = await response.text().catch(() => "");
        console.warn(`⚠️ Gemini HTTP ${response.status}: ${redactPii(errorText)}`);
      }
    } catch (err) {
      console.warn("⚠️ Fallo o timeout (8s) en Gemini, conmutando a Grok:", redactPii(String(err)));
    }
  }

  // -------------------------------------------------------------------------
  // 2. GROK (xAI)
  // -------------------------------------------------------------------------
  if (env.XAI_API_KEY && env.XAI_API_KEY.trim() !== "") {
    const model = env.XAI_MODEL ?? "grok-2-mini";
    const start = Date.now();
    try {
      const url = "https://api.x.ai/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          choices?: Array<{
            message?: { content?: string };
          }>;
        };

        const rawText = body.choices?.[0]?.message?.content;
        if (rawText) {
          const parsedJson = JSON.parse(cleanJsonText(rawText));
          const validation = schema.safeParse(parsedJson);
          if (validation.success) {
            let finalData = validation.data;
            if (category) {
              const guardrail = checkCategoryGuardrails(JSON.stringify(finalData), category);
              if (!guardrail.ok) {
                console.warn(
                  `⚠️ Grok violó guardrail de categoría (${category}): ${guardrail.violatedTerms.join(", ")}. Sanitizando...`,
                );
                const sanitizedStr = sanitizeCategoryContent(JSON.stringify(finalData), category);
                const secondCheck = schema.safeParse(JSON.parse(sanitizedStr));
                if (secondCheck.success) {
                  finalData = secondCheck.data;
                }
              }
            }

            return {
              data: finalData,
              provider: "grok",
              model,
              latencyMs: Date.now() - start,
            };
          } else {
            console.warn(
              "⚠️ Grok retornó JSON que no cumplió el esquema Zod:",
              validation.error.issues,
            );
          }
        }
      } else {
        const errorText = await response.text().catch(() => "");
        console.warn(`⚠️ Grok HTTP ${response.status}: ${redactPii(errorText)}`);
      }
    } catch (err) {
      console.warn(
        "⚠️ Fallo o timeout (8s) en Grok, conmutando a OpenRouter/Claude:",
        redactPii(String(err)),
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. OPENROUTER / ANTHROPIC CLAUDE
  // -------------------------------------------------------------------------
  if (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim() !== "") {
    const model = env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";
    const start = Date.now();
    try {
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          choices?: Array<{
            message?: { content?: string };
          }>;
        };

        const rawText = body.choices?.[0]?.message?.content;
        if (rawText) {
          const parsedJson = JSON.parse(cleanJsonText(rawText));
          const validation = schema.safeParse(parsedJson);
          if (validation.success) {
            return {
              data: validation.data,
              provider: "openrouter",
              model,
              latencyMs: Date.now() - start,
            };
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Fallo o timeout (8s) en OpenRouter:", redactPii(String(err)));
    }
  } else if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim() !== "") {
    const model = env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
    const start = Date.now();
    try {
      const url = "https://api.anthropic.com/v1/messages";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: `${systemPrompt}\n\nIMPORTANTE: Retorna ÚNICAMENTE un objeto JSON válido que cumpla el esquema requerido. Sin texto adicional ni formato de bloque.`,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };

        const rawText = body.content?.[0]?.text;
        if (rawText) {
          const parsedJson = JSON.parse(cleanJsonText(rawText));
          const validation = schema.safeParse(parsedJson);
          if (validation.success) {
            return {
              data: validation.data,
              provider: "claude",
              model,
              latencyMs: Date.now() - start,
            };
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Fallo o timeout (8s) en Claude:", redactPii(String(err)));
    }
  }

  // -------------------------------------------------------------------------
  // 4. FALLBACK DETERMINISTA LOCAL (Semillas PRNG, ~2ms de latencia)
  // -------------------------------------------------------------------------
  const fallbackStart = Date.now();
  const fallbackData = deterministicFallback();
  return {
    data: fallbackData,
    provider: "deterministic",
    model: "deterministic-prng",
    latencyMs: Date.now() - fallbackStart,
  };
}
