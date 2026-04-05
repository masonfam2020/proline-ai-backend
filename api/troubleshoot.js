import OpenAI from "openai";

function isHighRisk(text = "") {
  const t = text.toLowerCase();

  const riskyTerms = [
    "gas leak",
    "smell gas",
    "carbon monoxide",
    "co leak",
    "live voltage",
    "hot wire",
    "bypass safety",
    "jump out switch",
    "refrigerant",
    "sealed system",
    "venting code",
    "combustion issue",
    "arc flash"
  ];

  return riskyTerms.some(term => t.includes(term));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY in Vercel environment variables."
      });
    }

    const { equipmentType, brand, model, issue } = req.body || {};

    if (!issue || !issue.trim()) {
      return res.status(400).json({
        error: "Issue is required."
      });
    }

    const combinedText = `
Equipment Type: ${equipmentType || "Unknown"}
Brand: ${brand || "Unknown"}
Model: ${model || "Unknown"}
Issue: ${issue}
`.trim();

    if (isHighRisk(combinedText)) {
      return res.status(200).json({
        answer: `Issue summary:
High-risk category detected.

Likely causes:
- The problem may involve gas, combustion, live electrical, refrigerant, or another serious hazard.
- More detail is needed before safe troubleshooting can continue.

Safe next checks:
- Stop work until the hazard is controlled.
- Isolate power or fuel safely if appropriate.
- Use manufacturer documentation and proper licensed procedure.

Likely parts to verify:
- Do not guess on parts until the hazard is properly diagnosed.

Confidence:
Medium`,
        warning:
          "High-risk category detected. Do not bypass safeties or continue with unsafe testing."
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `You are a contractor-focused troubleshooting assistant for appliance, plumbing, and light mechanical field work.

Rules:
- Be direct, short, and practical.
- Assume the user is on a phone at a job site.
- Return exactly these sections:

Issue summary:
Likely causes:
Safe next checks:
Likely parts to verify:
Confidence:

- Do not give unsafe step-by-step instructions for gas, combustion, live electrical, refrigerant, or code compliance.
- If uncertain, say so clearly.
- Do not pretend exact model certainty unless the model info is specific.`
        },
        {
          role: "user",
          content: combinedText
        }
      ]
    });

    const answer = response.output_text || "No answer was returned.";

    return res.status(200).json({
      answer,
      warning:
        "Guidance only. Verify with manufacturer documentation, safe testing procedure, local code, and licensed trade judgment."
    });
  } catch (error) {
    console.error("API error details:", error);

    return res.status(500).json({
      error: error?.message || "Server error while getting troubleshooting help."
    });
  }
}
