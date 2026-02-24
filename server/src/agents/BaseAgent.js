// ──────────────────────────────────────────────────────────
// BaseAgent — Abstract base class for all UrbanCare agents
// ──────────────────────────────────────────────────────────

class BaseAgent {
  /**
   * @param {Object} config
   * @param {string} config.id          — Unique agent ID (kebab-case)
   * @param {string} config.name        — Human-readable name
   * @param {number} config.number      — Agent number (1-30)
   * @param {string} config.layer       — Layer name
   * @param {number} config.layerNumber — Layer number (1-8)
   * @param {string} config.modelId     — HuggingFace model ID or 'gemini'
   * @param {string} config.modelName   — Short model name for display
   * @param {string} config.task        — Model task type
   * @param {string} config.description — What this agent does
   * @param {string} [config.offlineModelId] — Offline/edge model variant
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.number = config.number;
    this.layer = config.layer;
    this.layerNumber = config.layerNumber;
    this.modelId = config.modelId;
    this.modelName = config.modelName;
    this.task = config.task;
    this.description = config.description;
    this.offlineModelId = config.offlineModelId || null;

    // Runtime state
    this.status = 'idle'; // idle | processing | done | error
    this.lastResult = null;
    this.lastError = null;
    this.lastExecutionMs = 0;
    this.executionCount = 0;
  }

  /**
   * Main entry point — wraps process() with error handling and timing.
   */
  async execute(input, options = {}) {
    const startTime = Date.now();
    this.status = 'processing';
    this.lastError = null;

    const isOffline = options.offline || false;

    try {
      console.log(`  🤖 Agent #${this.number} [${this.name}] — executing (${isOffline ? 'OFFLINE' : 'ONLINE'})`);

      const result = await this.process(input, {
        ...options,
        modelId: isOffline && this.offlineModelId ? this.offlineModelId : this.modelId,
      });

      this.status = 'done';
      this.lastResult = result;
      this.lastExecutionMs = Date.now() - startTime;
      this.executionCount++;

      console.log(`  ✅ Agent #${this.number} [${this.name}] — done in ${this.lastExecutionMs}ms`);

      return {
        agentId: this.id,
        agentName: this.name,
        agentNumber: this.number,
        layer: this.layer,
        model: isOffline && this.offlineModelId ? this.offlineModelId : this.modelId,
        executionMs: this.lastExecutionMs,
        offline: isOffline,
        result,
      };
    } catch (err) {
      this.status = 'error';
      this.lastError = err.message;
      this.lastExecutionMs = Date.now() - startTime;

      console.error(`  ❌ Agent #${this.number} [${this.name}] — error: ${err.message}`);

      return {
        agentId: this.id,
        agentName: this.name,
        agentNumber: this.number,
        layer: this.layer,
        model: isOffline && this.offlineModelId ? this.offlineModelId : this.modelId,
        executionMs: this.lastExecutionMs,
        offline: isOffline,
        error: err.message,
        result: null,
      };
    }
  }

  /**
   * Abstract — override in each agent subclass.
   */
  async process(_input, _options) {
    throw new Error(`Agent ${this.id} must implement process()`);
  }

  /**
   * Returns the agent's current info + status.
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      number: this.number,
      layer: this.layer,
      layerNumber: this.layerNumber,
      modelId: this.modelId,
      modelName: this.modelName,
      offlineModelId: this.offlineModelId,
      task: this.task,
      description: this.description,
      status: this.status,
      lastExecutionMs: this.lastExecutionMs,
      executionCount: this.executionCount,
      lastError: this.lastError,
    };
  }
}

module.exports = BaseAgent;
