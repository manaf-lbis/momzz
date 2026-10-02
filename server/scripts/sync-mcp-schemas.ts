import fs from 'fs';
import path from 'path';
import { toolRegistry } from '../src/features/mcp/tools/mcp-tools.registry';

const targetDir = 'C:\\Users\\login\\.gemini\\antigravity\\mcp\\MomzzMCP';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const tool of toolRegistry) {
  const rawJsonSchema =
    typeof (tool.parameters as any).toJSONSchema === 'function'
      ? (tool.parameters as any).toJSONSchema()
      : {};

  const toolObj = {
    name: tool.name,
    description: tool.description,
    parameters: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: rawJsonSchema.properties || {},
      required: rawJsonSchema.required || [],
    },
  };

  const filePath = path.join(targetDir, `${tool.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(toolObj, null, 2), 'utf-8');
  console.log('Synchronized Antigravity schema:', tool.name);
}

// Backwards-compatible alias for momzz_list_workers
const adminWorkersTool = toolRegistry.find((t) => t.name === 'momzz_admin_list_workers');
if (adminWorkersTool) {
  const rawJsonSchema =
    typeof (adminWorkersTool.parameters as any).toJSONSchema === 'function'
      ? (adminWorkersTool.parameters as any).toJSONSchema()
      : {};
  const aliasObj = {
    name: 'momzz_list_workers',
    description: adminWorkersTool.description,
    parameters: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: rawJsonSchema.properties || {},
      required: rawJsonSchema.required || [],
    },
  };
  fs.writeFileSync(path.join(targetDir, 'momzz_list_workers.json'), JSON.stringify(aliasObj, null, 2), 'utf-8');
  console.log('Synchronized Antigravity alias: momzz_list_workers');
}

console.log('All MCP schemas successfully synchronized!');
