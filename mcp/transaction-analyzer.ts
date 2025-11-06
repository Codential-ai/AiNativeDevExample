#!/usr/bin/env node

import * as readline from "readline";

interface TransactionViolation {
  line: number;
  code: string;
  issue: string;
  suggestion: string;
}

interface AnalysisResult {
  violations: TransactionViolation[];
  isSafe: boolean;
  message: string;
}

/**
 * Analyzes TypeScript/JavaScript code for transaction-related race conditions
 * Checks if methods that perform multiple mutations are wrapped in Mongoose transactions
 */
function analyzeTransactions(code: string): AnalysisResult {
  const violations: TransactionViolation[] = [];
  const lines = code.split("\n");

  // Mutation patterns that indicate database operations
  const mutationPatterns = [
    /createOrder\s*\(/,
    /updateInventory\s*\(/,
    /\.create\(/,
    /\.save\(/,
    /\.updateOne\(/,
    /\.updateMany\(/,
    /\.deleteOne\(/,
    /\.deleteMany\(/,
    /\.findByIdAndUpdate\(/,
    /\.findOneAndUpdate\(/,
    /\.insertMany\(/,
  ];

  // Session/transaction patterns
  const sessionPatterns = [
    /startSession\(\)/,
    /startTransaction\(\)/,
    /commitTransaction\(\)/,
    /abortTransaction\(\)/,
    /{\s*session\s*}/,
  ];

  // Count mutations in the code
  let mutationCount = 0;
  const mutationLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for mutations
    for (const pattern of mutationPatterns) {
      if (pattern.test(line)) {
        mutationCount++;
        mutationLines.push(i + 1);

        // Check if this mutation line passes a session
        // Allow if line ends with a comma (continuation) and next line might have session
        const hasSessionInLine = /{\s*session\s*}|session\s*[:=]/.test(line);
        const isContinuation = /[,({]$/.test(line.trim());

        if (!hasSessionInLine && !isContinuation) {
          violations.push({
            line: i + 1,
            code: line.trim(),
            issue: `Mutation operation without session parameter`,
            suggestion: `Add { session } parameter: ${line.replace(
              /(\))/,
              ", { session })"
            )}`,
          });
        }
      }
    }
  }

  // Check if multiple mutations exist without transaction wrapper
  if (mutationCount > 1) {
    // Look for session initialization
    let hasSessionWrapper = false;

    for (const line of lines) {
      for (const pattern of sessionPatterns) {
        if (pattern.test(line)) {
          hasSessionWrapper = true;
          break;
        }
      }
      if (hasSessionWrapper) break;
    }

    if (!hasSessionWrapper && violations.length === 0) {
      // All mutations found, but no transaction wrapper
      violations.push({
        line: mutationLines[0],
        code: lines[mutationLines[0] - 1].trim(),
        issue: `${mutationCount} mutations detected without transaction wrapper`,
        suggestion: `Wrap all ${mutationCount} operations in a Mongoose transaction`,
      });
    }
  }

  const isSafe = violations.length === 0;
  const message = isSafe
    ? `✅ No race condition violations found (${mutationCount} mutation${mutationCount !== 1 ? "s" : ""})`
    : `❌ ${violations.length} potential race condition${violations.length !== 1 ? "s" : ""} found`;

  return { violations, isSafe, message };
}

// MCP Protocol Handler
interface MCPRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, unknown>;
  id: string | number;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

function sendResponse(response: MCPResponse) {
  console.log(JSON.stringify(response));
}

async function handleRequest(request: MCPRequest) {
  try {
    if (request.method === "tools/list") {
      sendResponse({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "check_transactions",
              description:
                "Analyzes code for race condition vulnerabilities related to unprotected multi-mutation database operations",
              inputSchema: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                    description: "TypeScript/JavaScript code to analyze",
                  },
                },
                required: ["code"],
              },
            },
          ],
        },
      });
    } else if (request.method === "tools/call") {
      const { name, arguments: args } = request.params as {
        name: string;
        arguments: Record<string, unknown>;
      };

      if (name === "check_transactions") {
        const { code } = args as { code: string };

        if (!code) {
          sendResponse({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32602, message: "Missing 'code' parameter" },
          });
          return;
        }

        const result = analyzeTransactions(code);

        sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } else {
        sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
      }
    } else if (request.method === "check_transactions") {
      const { code } = request.params as { code: string };

      if (!code) {
        sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32602, message: "Missing 'code' parameter" },
        });
        return;
      }

      const result = analyzeTransactions(code);

      sendResponse({
        jsonrpc: "2.0",
        id: request.id,
        result,
      });
    } else if (request.method === "initialize") {
      sendResponse({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "transaction-analyzer",
            version: "1.0.0",
          },
          capabilities: {
            tools: {
              check_transactions: {
                name: "check_transactions",
                description:
                  "Analyzes code for race condition vulnerabilities related to unprotected multi-mutation database operations",
                inputSchema: {
                  type: "object",
                  properties: {
                    code: {
                      type: "string",
                      description: "TypeScript/JavaScript code to analyze",
                    },
                  },
                  required: ["code"],
                },
              },
            },
          },
        },
      });
    } else {
      sendResponse({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: `Unknown method: ${request.method}` },
      });
    }
  } catch (error) {
    sendResponse({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    });
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  let lineCount = 0;

  rl.on("line", async (line: string) => {
    lineCount++;
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const request: MCPRequest = JSON.parse(trimmed);
      await handleRequest(request);
    } catch (error) {
      sendResponse({
        jsonrpc: "2.0",
        id: "unknown",
        error: {
          code: -32700,
          message:
            error instanceof Error ? error.message : "Parse error",
        },
      });
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });

  // Prevent the process from exiting while listening to stdin
  process.stdin.resume();
}

main();
