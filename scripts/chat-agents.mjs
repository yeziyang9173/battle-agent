#!/usr/bin/env node

import path from "node:path";
import { promises as fs } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const AGENT_DIRS = [
  "academic",
  "design",
  "engineering",
  "finance",
  "game-development",
  "marketing",
  "paid-media",
  "product",
  "project-management",
  "sales",
  "spatial-computing",
  "specialized",
  "strategy",
  "support",
  "testing",
];

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};

function colorize(text, ...codes) {
  return `${codes.join("")}${text}${COLORS.reset}`;
}

function divider(char = "═", width = 78) {
  return char.repeat(width);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function makeShortName(name) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 10);
  if (words.length === 2) return `${words[0].slice(0, 5)}/${words[1].slice(0, 5)}`;
  return words.map((word) => word[0]).join("").slice(0, 6).toUpperCase();
}

function extractHandoffLine(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.at(-1) ?? "";
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") {
    return { frontmatter: {}, body: content.trim() };
  }

  const end = lines.indexOf("---", 1);
  if (end === -1) {
    return { frontmatter: {}, body: content.trim() };
  }

  const frontmatter = Object.fromEntries(
    lines
      .slice(1, end)
      .map((line) => {
        const split = line.indexOf(":");
        if (split === -1) return [line.trim(), ""];
        return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
      })
      .filter(([key]) => key.length > 0),
  );

  return {
    frontmatter,
    body: lines.slice(end + 1).join("\n").trim(),
  };
}

async function loadAgents() {
  const agents = [];

  for (const dir of AGENT_DIRS) {
    const absoluteDir = path.join(process.cwd(), dir);
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const fullPath = path.join(absoluteDir, entry.name);
      const content = await fs.readFile(fullPath, "utf8");
      const { frontmatter, body } = parseFrontmatter(content);
      const name = frontmatter.name || entry.name.replace(/\.md$/, "");
      agents.push({
        id: slugify(name),
        slug: slugify(name),
        shortName: makeShortName(name),
        name,
        description: frontmatter.description || "",
        emoji: frontmatter.emoji || "✦",
        vibe: frontmatter.vibe || "",
        category: dir,
        sourcePath: path.relative(process.cwd(), fullPath),
        promptBody: body,
      });
    }
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

function parseArgs(argv) {
  const map = new Map();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      map.set(key, "true");
      continue;
    }
    map.set(key, next);
    i += 1;
  }

  const topic = map.get("topic")?.trim();
  const rawAgents = map.get("agents");
  const agents = rawAgents
    ? rawAgents
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  if (!topic) throw new Error("Missing required --topic");
  if (agents.length < 2 && map.get("auto-agents") !== "true") {
    throw new Error("Pass at least two agent ids via --agents a,b,c or use --auto-agents");
  }

  const maxTurnsRaw = map.get("max-turns");
  const maxTurns = maxTurnsRaw ? Number(maxTurnsRaw) : 8;
  const recentCount = Number(map.get("recent-count") ?? "6");
  const agentCountRaw = Number(map.get("agent-count") ?? "3");

  return {
    topic,
    agents,
    briefing: map.get("briefing") ?? undefined,
    briefingFile: map.get("briefing-file") ?? undefined,
    maxTurns: Number.isFinite(maxTurns) ? Math.max(2, maxTurns) : 8,
    recentCount: Number.isFinite(recentCount) ? Math.max(2, recentCount) : 6,
    replyStyle: map.get("reply-style") === "tight" ? "tight" : "balanced",
    endless: map.get("endless") === "true",
    autoAgents: map.get("auto-agents") === "true",
    lang: map.get("lang") === "zh" ? "zh" : "en",
    aggressive: map.get("aggressive") === "true",
  };
}

async function loadBriefing(options) {
  if (options.briefingFile) {
    return fs.readFile(path.resolve(process.cwd(), options.briefingFile), "utf8");
  }
  return options.briefing ?? "";
}

function summarize(messages) {
  return messages
    .slice(-6)
    .map((message) => {
      const compact = message.content.replace(/\s+/g, " ").trim();
      return `${message.agentShortName}: ${compact.slice(0, 200)}${compact.length > 200 ? "..." : ""}`;
    })
    .join("\n");
}

function buildLanguageInstruction(lang) {
  if (lang === "zh") {
    return "全程使用简体中文回答。除产品名、框架名、公司名和必要技术术语外，不要使用英文句子。表达要自然、直接、有观点。";
  }
  return "Respond in clear English.";
}

function buildSystemPrompt({ agent, topic, briefing, summary, recent, participants, replyStyle, lang }) {
  const recentTranscript = recent
    .map((message) => `[${message.agentShortName}] ${message.content}`)
    .join("\n\n");

  return [
    agent.promptBody,
    "",
    "## Multi-Agent CLI Conversation Wrapper",
    buildLanguageInstruction(lang),
    `You are participating in a live multi-agent discussion about: ${topic}`,
    `Other participants: ${participants.filter((name) => name !== agent.name).join(", ")}`,
    "The user is watching this discussion live in the terminal.",
    "Respond to prior points, avoid repetition, and move the discussion forward.",
    "End your reply with a final single-line handoff cue for the next speaker. Make it concrete.",
    replyStyle === "tight"
      ? "Keep your reply concise: no more than 4 short paragraphs or 6 bullets."
      : "Keep your reply readable and concise: 2-4 short paragraphs max.",
    briefing ? `Shared briefing:\n${briefing}` : "No shared briefing was provided.",
    summary ? `Rolling summary:\n${summary}` : "No rolling summary yet.",
    recentTranscript ? `Recent transcript:\n${recentTranscript}` : "No prior transcript yet.",
    "You are speaking only as yourself. Do not narrate for other agents.",
  ].join("\n");
}

async function autoSelectAgents({ client, topic, lang, agentCount, allAgents, aggressive }) {
  const roster = allAgents
    .map((agent) => `- ${agent.slug} | ${agent.name} | ${agent.category} | ${agent.description} | ${agent.vibe}`)
    .join("\n");

  const selectorInstruction = lang === "zh"
    ? `你是一个多 agent 讨论的选角器。根据 topic，从下方 roster 中挑选 ${agentCount} 个最适合讨论的 agent。
要求：
1. ${aggressive ? "使用更 aggressive 的选角逻辑：优先选择宏观趋势、底层架构、产品/商业、批判/收敛类角色，形成观点冲突和互补。" : "优先选择互补性强、信息密度高的角色。"}
2. 不要选职能过于重复的 agent。
3. 如果 topic 涉及趋势、产品比较、生态、策略，优先考虑 Trend Researcher、Tool Evaluator、Agents Orchestrator、Product Manager、Software Architect、Executive Summary Generator 等高信号角色。
4. 输出必须是 JSON，格式： {"selected":["slug1","slug2"],"reason":"..."}`
    : `You are selecting ${agentCount} agents for a live multi-agent discussion.
${aggressive ? "Be aggressive: bias toward macro trend, deep architecture, product/commercial, and critical synthesis roles to maximize productive tension." : "Choose high-signal, complementary roles."}
Avoid redundant roles. Return JSON only in this shape: {"selected":["slug1","slug2"],"reason":"..."}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 500,
    thinking: { type: "adaptive" },
    system: selectorInstruction,
    messages: [
      {
        role: "user",
        content: `Topic:\n${topic}\n\nAgent roster:\n${roster}`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  try {
    const parsed = JSON.parse(text);
    const selected = Array.isArray(parsed.selected) ? parsed.selected.slice(0, agentCount) : [];
    const reason = typeof parsed.reason === "string" ? parsed.reason : "";
    return { selected, reason };
  } catch {
    return { selected: [], reason: text };
  }
}

function fallbackAutoSelect(topic, allAgents, agentCount, aggressive) {
  const lower = topic.toLowerCase();

  const preferredGroups = [
    {
      test: /agent|model|ecosystem|framework|openai|anthropic|google|china|research|trend|product|tool|orchestration|cursor|claude|openclaw|hermes/,
      picks: aggressive
        ? ["trend-researcher", "software-architect", "product-manager", "executive-summary-generator", "tool-evaluator"]
        : ["trend-researcher", "tool-evaluator", "agents-orchestrator", "product-manager", "software-architect"],
    },
    {
      test: /security|threat|soc|detection|incident/,
      picks: aggressive
        ? ["threat-detection-engineer", "security-engineer", "incident-response-commander", "reality-checker"]
        : ["security-engineer", "threat-detection-engineer", "incident-response-commander"],
    },
    {
      test: /frontend|ui|ux|react|design/,
      picks: aggressive
        ? ["frontend-developer", "ui-designer", "ux-architect", "accessibility-auditor"]
        : ["frontend-developer", "ui-designer", "ux-architect"],
    },
  ];

  for (const group of preferredGroups) {
    if (group.test.test(lower)) {
      return group.picks.slice(0, agentCount);
    }
  }

  return (aggressive
    ? ["trend-researcher", "software-architect", "product-manager", "executive-summary-generator"]
    : ["agents-orchestrator", "trend-researcher", "tool-evaluator"]
  ).slice(0, agentCount);
}

function shouldStop(messages, maxTurns, endless) {
  if (!endless && messages.length >= maxTurns) return true;
  if (messages.length < 3) return false;

  const lastThree = messages.slice(-3).map((message) =>
    message.content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  );

  if (lastThree[2] === lastThree[1] || lastThree[2] === lastThree[0]) return true;

  return messages.slice(-2).every((message) =>
    /discussion (has )?(converged|settled)|nothing substantial to add|final takeaway/i.test(message.content),
  );
}

async function saveRun(run) {
  const runsDir = path.join(process.cwd(), "runs");
  await fs.mkdir(runsDir, { recursive: true });
  const jsonPath = path.join(runsDir, `${run.id}.json`);
  const mdPath = path.join(runsDir, `${run.id}.md`);

  const markdown = [
    `# Multi-agent run ${run.id}`,
    "",
    `- Topic: ${run.topic}`,
    `- Created: ${run.createdAt}`,
    `- Completed: ${run.completedAt}`,
    `- Agents: ${run.selectedAgentIds.join(", ")}`,
    `- Max turns: ${run.maxTurns}`,
    `- Endless: ${run.endless ? "yes" : "no"}`,
    `- Language: ${run.lang}`,
    `- Auto agents: ${run.autoAgents ? "yes" : "no"}`,
    `- Aggressive: ${run.aggressive ? "yes" : "no"}`,
    run.selectionReason ? `- Selection reason: ${run.selectionReason}` : "",
    "",
    "## Briefing",
    "",
    run.briefing || "(none)",
    "",
    "## Transcript",
    "",
    ...run.messages.flatMap((message) => [
      `### Turn ${message.turnIndex + 1} — ${message.agentName} [${message.agentShortName}]`,
      "",
      message.content,
      "",
      `> Handoff: ${message.handoffLine || "(none)"}`,
      "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");

  await Promise.all([
    fs.writeFile(jsonPath, JSON.stringify(run, null, 2), "utf8"),
    fs.writeFile(mdPath, markdown, "utf8"),
  ]);

  return { jsonPath, mdPath };
}

function printRunHeader({ runId, topic, selectedAgents, briefing, maxTurns, endless, lang, autoAgents, selectionReason, aggressive }) {
  console.log(`\n${colorize(divider(), COLORS.cyan)}`);
  console.log(colorize("AGENCY AGENTS LIVE CHAT", COLORS.bold, COLORS.cyan));
  console.log(colorize(divider(), COLORS.cyan));
  console.log(`${colorize("run", COLORS.dim)}      ${runId}`);
  console.log(`${colorize("topic", COLORS.dim)}    ${topic}`);
  console.log(`${colorize("turns", COLORS.dim)}    ${endless ? "infinite (press q to stop)" : maxTurns}`);
  console.log(`${colorize("mode", COLORS.dim)}     ${endless ? "endless live room" : "auto run"}`);
  console.log(`${colorize("lang", COLORS.dim)}     ${lang}`);
  console.log(`${colorize("style", COLORS.dim)}    ${aggressive ? "aggressive" : "standard"}`);
  console.log(`${colorize("agents", COLORS.dim)}   ${selectedAgents.map((agent) => `${agent.emoji} ${agent.shortName}`).join("  •  ")}`);
  if (autoAgents) {
    console.log(`${colorize("select", COLORS.dim)}   auto-agents enabled`);
    if (selectionReason) {
      console.log(`${colorize("reason", COLORS.dim)}   ${selectionReason}`);
    }
  }
  console.log(`${colorize("output", COLORS.dim)}   runs/${runId}.json`);
  console.log(`${colorize("output", COLORS.dim)}   runs/${runId}.md`);
  if (briefing) {
    console.log(`${colorize("brief", COLORS.dim)}    ${briefing.slice(0, 180)}${briefing.length > 180 ? "..." : ""}`);
  }
  console.log(colorize("\n[live] transcript stream starts below\n", COLORS.yellow));
}

function printTurnHeader(agent, turnIndex) {
  console.log(`\n${colorize(divider("─"), COLORS.blue)}`);
  console.log(
    `${colorize(`TURN ${turnIndex + 1}`, COLORS.bold, COLORS.blue)}  ${agent.emoji} ${colorize(`[${agent.shortName}]`, COLORS.bold, COLORS.white)}  ${colorize(agent.name, COLORS.white)}  ${colorize(`(${agent.category})`, COLORS.dim)}`,
  );
  if (agent.vibe) {
    console.log(colorize(agent.vibe, COLORS.dim));
  }
  console.log(colorize(`${agent.shortName} is typing...`, COLORS.magenta));
  console.log(colorize(divider("·"), COLORS.dim));
}

function printTurnFooter(messageCount, handoffLine) {
  console.log(colorize(divider("·"), COLORS.dim));
  if (handoffLine) {
    console.log(colorize(`→ handoff: ${handoffLine}`, COLORS.yellow));
  }
  console.log(colorize(`[status] ${messageCount} message(s) captured so far`, COLORS.green));
}

function printRunFooter(saved, transcript) {
  console.log(`\n${colorize(divider(), COLORS.green)}`);
  console.log(colorize(`[done] conversation saved after ${transcript.length} turn(s)`, COLORS.bold, COLORS.green));
  console.log(`- ${path.relative(process.cwd(), saved.jsonPath)}`);
  console.log(`- ${path.relative(process.cwd(), saved.mdPath)}`);
  console.log(colorize(divider(), COLORS.green));
}

function startQuitWatcher() {
  if (!process.stdin.isTTY) {
    return { shouldStop: () => false, close: () => {} };
  }

  let stop = false;
  const previousRawMode = process.stdin.isRaw;

  process.stdin.setRawMode(true);
  process.stdin.resume();

  const onData = (chunk) => {
    const key = chunk.toString("utf8");
    if (key === "q" || key === "Q" || key === "\u0003") {
      stop = true;
    }
  };

  process.stdin.on("data", onData);

  return {
    shouldStop: () => stop,
    close: () => {
      process.stdin.off("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(Boolean(previousRawMode));
      }
      process.stdin.pause();
    },
  };
}

async function runSingleTurn({ client, options, selectedAgents, transcript, turnIndex }) {
  const agent = selectedAgents[turnIndex % selectedAgents.length];
  const recent = transcript.slice(-options.recentCount);
  const summary = summarize(transcript);

  printTurnHeader(agent, turnIndex);

  const system = buildSystemPrompt({
    agent,
    topic: options.topic,
    briefing: options.briefing,
    summary,
    recent,
    participants: selectedAgents.map((item) => item.name),
    replyStyle: options.replyStyle,
    lang: options.lang,
  });

  let content = "";
  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: options.replyStyle === "tight" ? 500 : 900,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: `Continue the discussion on: ${options.topic}` }],
    stream: true,
  });

  stream.on("text", (delta) => {
    content += delta;
    process.stdout.write(delta);
  });

  const finalMessage = await stream.finalMessage();
  if (!content) {
    content = finalMessage.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    process.stdout.write(content);
  }
  process.stdout.write("\n");

  const handoffLine = extractHandoffLine(content);
  const entry = {
    turnIndex,
    agentId: agent.id,
    agentName: agent.name,
    agentShortName: agent.shortName,
    content: content.trim(),
    handoffLine,
    createdAt: new Date().toISOString(),
  };

  transcript.push(entry);
  printTurnFooter(transcript.length, handoffLine);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const briefing = (await loadBriefing(options)).trim();
  options.briefing = briefing;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required in the environment.");
  }

  const allAgents = await loadAgents();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let selectionReason = "";
  let selectedAgents;

  if (options.autoAgents) {
    const auto = await autoSelectAgents({
      client,
      topic: options.topic,
      lang: options.lang,
      agentCount: options.agentCount,
      allAgents,
      aggressive: options.aggressive,
    });

    const candidateSlugs = auto.selected.length > 0 ? auto.selected : fallbackAutoSelect(options.topic, allAgents, options.agentCount, options.aggressive);
    selectionReason = auto.reason || "fallback heuristic selection";

    selectedAgents = candidateSlugs
      .map((id) => allAgents.find((item) => item.id === id || item.slug === id))
      .filter(Boolean);

    if (selectedAgents.length < 2) {
      const fallback = fallbackAutoSelect(options.topic, allAgents, options.agentCount, options.aggressive)
        .map((id) => allAgents.find((item) => item.id === id || item.slug === id))
        .filter(Boolean);
      selectedAgents = fallback;
    }
  } else {
    selectedAgents = options.agents.map((id) => {
      const agent = allAgents.find((item) => item.id === id || item.slug === id);
      if (!agent) throw new Error(`Agent not found: ${id}`);
      return agent;
    });
  }

  if (!selectedAgents || selectedAgents.length < 2) {
    throw new Error("Auto-selection failed to find at least two agents.");
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const createdAt = new Date().toISOString();
  const transcript = [];

  printRunHeader({
    runId,
    topic: options.topic,
    selectedAgents,
    briefing,
    maxTurns: options.maxTurns,
    endless: options.endless,
    lang: options.lang,
    autoAgents: options.autoAgents,
    selectionReason,
    aggressive: options.aggressive,
  });

  const quitWatcher = options.endless ? startQuitWatcher() : null;

  try {
    for (let turnIndex = 0; options.endless || turnIndex < options.maxTurns; turnIndex += 1) {
      if (quitWatcher?.shouldStop()) {
        console.log(colorize("\n[stop] live room stopped by keypress.", COLORS.yellow));
        break;
      }

      await runSingleTurn({
        client,
        options,
        selectedAgents,
        transcript,
        turnIndex,
      });

      if (quitWatcher?.shouldStop()) {
        console.log(colorize("\n[stop] live room stopped by keypress.", COLORS.yellow));
        break;
      }

      if (shouldStop(transcript, options.maxTurns, options.endless)) {
        console.log(colorize(`\n[stop] conversation ended after ${transcript.length} turns.`, COLORS.yellow));
        break;
      }
    }
  } finally {
    quitWatcher?.close();
  }

  const saved = await saveRun({
    id: runId,
    topic: options.topic,
    briefing,
    maxTurns: options.maxTurns,
    endless: options.endless,
    lang: options.lang,
    autoAgents: options.autoAgents,
    selectionReason,
    aggressive: options.aggressive,
    selectedAgentIds: selectedAgents.map((agent) => agent.id),
    completedAt: new Date().toISOString(),
    messages: transcript,
  });

  printRunFooter(saved, transcript);
}

main().catch((error) => {
  console.error(colorize(`\n[error] ${error instanceof Error ? error.message : String(error)}`, COLORS.bold, COLORS.red));
  process.exit(1);
});
