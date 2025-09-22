# Codex-Flow CLI Documentation

The Codex-Flow CLI is a comprehensive command-line interface for managing AI-powered development workflows with multi-agent orchestration.

## Installation

```bash
npm install -g codex-flow
```

Or use locally:

```bash
npm install codex-flow
npx codex-flow --help
```

## Quick Start

```bash
# Initialize a new project
codex-flow init my-project

# Create a swarm
codex-flow swarm create --topology mesh

# Spawn agents
codex-flow agent spawn legal-workflow-designer --task "Design client intake workflow"

# Execute tasks
codex-flow task execute "Compile discovery summary"
```

## Commands

### Project Management

#### `codex-flow init [project-name]`

Initialize a new Codex-Flow project with customizable templates.

**Options:**
- `-t, --template <template>` - Project template (basic, webapp, api, mobile, ml, library)
- `-d, --description <desc>` - Project description
- `--no-examples` - Skip example files
- `--no-git` - Skip git initialization
- `--no-install` - Skip dependency installation
- `-y, --yes` - Skip prompts and use defaults

**Examples:**
```bash
codex-flow init my-app --template webapp
codex-flow init api-server -t api -y
```

### Agent Management

#### `codex-flow agent spawn [type]`

Spawn a new AI agent with specific capabilities.

**Arguments:**
- `type` - Agent type (legal-workflow-designer, legal-researcher, legal-quality-analyst, legal-planner, compliance-reviewer, legal-architect, legal-efficiency-analyst, coordination-lead)

**Options:**
- `-n, --name <name>` - Agent name
- `-t, --task <task>` - Task description
- `-p, --priority <priority>` - Task priority (low, medium, high, critical)
- `-c, --capabilities <caps...>` - Additional capabilities
- `-m, --model <model>` - AI model to use
- `-T, --temperature <temp>` - Model temperature
- `--max-tokens <tokens>` - Maximum tokens
- `-y, --yes` - Skip prompts

**Examples:**
```bash
codex-flow agent spawn legal-workflow-designer --task "Draft contract summary"
codex-flow agent spawn legal-researcher -n "case-researcher" --priority high
```

#### `codex-flow agent list`

List all active agents.

**Options:**
- `-t, --type <type>` - Filter by agent type
- `-s, --status <status>` - Filter by status
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output

#### `codex-flow agent status <agent-id>`

Get detailed status of a specific agent.

**Options:**
- `--json` - Output as JSON

#### `codex-flow agent stop <agent-id>`

Stop a running agent.

**Options:**
- `-f, --force` - Force stop even if agent has active tasks

#### `codex-flow agent remove <agent-id>`

Remove an agent.

**Options:**
- `-f, --force` - Force removal without confirmation

#### `codex-flow agent logs <agent-id>`

View agent execution logs.

**Options:**
- `-n, --lines <count>` - Number of lines to show
- `-f, --follow` - Follow log output
- `--level <level>` - Minimum log level

### Swarm Management

#### `codex-flow swarm create [name]`

Create a new agent swarm with specified topology.

**Options:**
- `-t, --topology <topology>` - Swarm topology (mesh, star, hierarchical, ring)
- `-m, --max-agents <count>` - Maximum number of agents
- `-s, --strategy <strategy>` - Agent distribution strategy (balanced, specialized, adaptive)
- `--auto-spawn` - Automatically spawn initial agents
- `-y, --yes` - Skip prompts

**Examples:**
```bash
codex-flow swarm create legal-team --topology mesh --max-agents 5
codex-flow swarm create --topology hierarchical --auto-spawn
```

#### `codex-flow swarm list`

List all swarms.

**Options:**
- `-s, --status <status>` - Filter by status
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output

#### `codex-flow swarm status <swarm-id>`

Get detailed swarm status.

**Options:**
- `--json` - Output as JSON
- `--watch` - Watch for updates

#### `codex-flow swarm orchestrate <swarm-id> <task>`

Orchestrate a task across the swarm.

**Options:**
- `-p, --priority <priority>` - Task priority
- `-m, --max-agents <count>` - Maximum agents to use
- `-s, --strategy <strategy>` - Execution strategy (parallel, sequential, adaptive)
- `--timeout <seconds>` - Task timeout

**Examples:**
```bash
codex-flow swarm orchestrate legal-team "Prepare trial briefing package"
codex-flow swarm orchestrate swarm-123 "Coordinate due diligence review" --priority high
```

#### `codex-flow swarm scale <swarm-id> <target-agents>`

Scale swarm up or down.

**Options:**
- `--agent-types <types...>` - Preferred agent types for scaling up

#### `codex-flow swarm destroy <swarm-id>`

Destroy a swarm and all its agents.

**Options:**
- `-f, --force` - Force destruction without confirmation

### Task Management

#### `codex-flow task execute <task>`

Execute a task with AI agents.

**Options:**
- `-a, --agents <types...>` - Agent types to use
- `-p, --priority <priority>` - Task priority
- `-m, --max-agents <count>` - Maximum agents to use
- `-s, --strategy <strategy>` - Execution strategy
- `-t, --timeout <seconds>` - Task timeout
- `--swarm <swarm-id>` - Use specific swarm
- `--model <model>` - AI model to use
- `--temperature <temp>` - Model temperature
- `-y, --yes` - Skip prompts

**Examples:**
```bash
codex-flow task execute "Summarize opposing counsel filings" --agents legal-workflow-designer legal-quality-analyst
codex-flow task execute "Assess compliance gaps" -a legal-researcher legal-efficiency-analyst
```

#### `codex-flow task list`

List all tasks.

**Options:**
- `-s, --status <status>` - Filter by status
- `-p, --priority <priority>` - Filter by priority
- `-a, --agent <agent-id>` - Filter by assigned agent
- `--json` - Output as JSON
- `-v, --verbose` - Verbose output
- `-l, --limit <count>` - Limit results

#### `codex-flow task status <task-id>`

Get detailed task status.

**Options:**
- `--json` - Output as JSON
- `--watch` - Watch for updates

#### `codex-flow task cancel <task-id>`

Cancel a running task.

**Options:**
- `-f, --force` - Force cancellation without confirmation

#### `codex-flow task retry <task-id>`

Retry a failed task.

**Options:**
- `--with-modifications` - Allow modifications before retry

#### `codex-flow task logs <task-id>`

View task execution logs.

**Options:**
- `-n, --lines <count>` - Number of lines to show
- `-f, --follow` - Follow log output
- `--level <level>` - Minimum log level
- `--agent <agent-id>` - Filter by specific agent

#### `codex-flow task results <task-id>`

View task results and output.

**Options:**
- `--json` - Output as JSON
- `--download` - Download result files
- `--format <format>` - Output format (summary, detailed, files)

### Configuration Management

#### `codex-flow config show [key]`

Show current configuration.

**Options:**
- `--json` - Output as JSON
- `--global` - Show global configuration
- `--local` - Show local project configuration

#### `codex-flow config set <key> <value>`

Set configuration value.

**Options:**
- `--global` - Set in global configuration
- `--type <type>` - Value type (string, number, boolean, json)

**Examples:**
```bash
codex-flow config set agents.default.model gpt-4
codex-flow config set swarm.maxAgents 10 --type number
codex-flow config set debug true --type boolean --global
```

#### `codex-flow config unset <key>`

Remove configuration value.

**Options:**
- `--global` - Remove from global configuration

#### `codex-flow config reset`

Reset configuration to defaults.

**Options:**
- `--global` - Reset global configuration
- `--force` - Skip confirmation

#### `codex-flow config validate`

Validate configuration.

**Options:**
- `--global` - Validate global configuration
- `--local` - Validate local configuration

#### `codex-flow config export [file]`

Export configuration to file.

**Options:**
- `--global` - Export global configuration
- `--local` - Export local configuration
- `--format <format>` - Output format (json, yaml)

#### `codex-flow config import <file>`

Import configuration from file.

**Options:**
- `--global` - Import to global configuration
- `--merge` - Merge with existing configuration

### Tool Management

#### `codex-flow tool list`

List available and installed tools.

**Options:**
- `-i, --installed` - Show only installed tools
- `-a, --available` - Show only available tools
- `--category <category>` - Filter by category
- `--json` - Output as JSON

#### `codex-flow tool install <tool-id>`

Install a development tool.

**Options:**
- `--version <version>` - Specific version to install
- `--global` - Install globally
- `--dev` - Install as dev dependency
- `-y, --yes` - Skip confirmation prompts

#### `codex-flow tool remove <tool-id>`

Remove an installed tool.

**Options:**
- `-f, --force` - Force removal without confirmation

#### `codex-flow tool update [tool-id]`

Update installed tools.

**Options:**
- `--check` - Only check for updates, don't install

#### `codex-flow tool search <query>`

Search for available tools.

**Options:**
- `--category <category>` - Filter by category
- `--limit <count>` - Limit results

## Global Options

All commands support these global options:

- `-c, --config <path>` - Specify config file path
- `--verbose` - Enable verbose output
- `--no-color` - Disable colored output
- `--dry-run` - Show what would be done without executing
- `-h, --help` - Display help for command

## Configuration Files

### Global Configuration

Located at `~/.codex-flow/config.json`

### Local Configuration

Located at `.codex-flow/config.json` in your project root

### Environment Variables

- `CODEX_FLOW_CONFIG` - Path to config file
- `CODEX_FLOW_DEBUG` - Enable debug mode
- `CODEX_FLOW_LOG_LEVEL` - Set log level
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key

## Templates

### Available Templates

- **basic** - Simple TypeScript project
- **webapp** - Full-stack web application (React + Node.js)
- **api** - RESTful API server with Express
- **mobile** - React Native mobile application
- **ml** - Machine Learning project with TensorFlow.js
- **library** - NPM library/package

### Custom Templates

You can create custom templates by placing them in `~/.codex-flow/templates/` directory.

## Examples

### Complete Workflow

```bash
# 1. Initialize new project
codex-flow init my-webapp --template webapp

# 2. Navigate to project
cd my-webapp

# 3. Create development swarm
codex-flow swarm create dev-swarm --topology mesh --max-agents 4

# 4. Spawn specialized agents
codex-flow agent spawn legal-workflow-designer --name intake-specialist
codex-flow agent spawn legal-workflow-designer --name litigation-data-specialist
codex-flow agent spawn legal-quality-analyst --name qa-engineer
codex-flow agent spawn compliance-reviewer --name code-compliance-reviewer

# 5. Execute coordinated tasks
codex-flow task execute "Build user authentication system" \
  --agents legal-workflow-designer legal-quality-analyst compliance-reviewer \
  --strategy adaptive \
  --priority high

# 6. Monitor progress
codex-flow task status <task-id> --watch

# 7. View results
codex-flow task results <task-id> --format detailed
```

### Configuration Management

```bash
# Set up AI models
codex-flow config set agents.legal-workflow-designer.model gpt-4
codex-flow config set agents.legal-workflow-designer.temperature 0.1
codex-flow config set agents.legal-researcher.model gpt-4
codex-flow config set agents.legal-researcher.temperature 0.3

# Configure swarm defaults
codex-flow config set swarm.defaultTopology mesh
codex-flow config set swarm.maxAgents 5
codex-flow config set swarm.strategy balanced

# Set global preferences
codex-flow config set tasks.logLevel info --global
codex-flow config set tasks.retryAttempts 3 --global
```

## Troubleshooting

### Common Issues

1. **Command not found**: Make sure Codex-Flow is installed globally or use `npx`
2. **Permission denied**: Check file permissions and ensure Node.js >= 18
3. **API key errors**: Set your AI provider API keys in environment variables
4. **Memory issues**: Adjust task timeout and agent limits

### Debug Mode

Enable debug mode for verbose logging:

```bash
export CODEX_FLOW_DEBUG=true
codex-flow --verbose <command>
```

### Support

- **Documentation**: https://github.com/yourusername/codex-flow
- **Issues**: https://github.com/yourusername/codex-flow/issues
- **Discussions**: https://github.com/yourusername/codex-flow/discussions