// ──────────────────────────────────────────────────────────
// AgentOrchestrator — 8-Layer Pipeline Coordinator
// ──────────────────────────────────────────────────────────

const registry = require('./AgentRegistry');
const { runAgent } = require('./agentWrapper');

const LAYER_ORDER = [1, 2, 4, 3, 5, 6, 7, 8]; // Note: Layer 4 (multimodal) runs before Layer 3 (reasoning)

class AgentOrchestrator {
  constructor() {
    this.pipelineRunning = false;
    this.lastPipelineResult = null;
  }

  /**
   * Run the full 8-layer pipeline.
   *
   * @param {Object} input — Patient data, images, audio, etc.
   * @param {Object} [options]
   * @param {boolean} [options.offline] — Run in offline mode
   * @param {number[]} [options.layers] — Specific layers to run (default: all)
   * @param {number[]} [options.agents] — Specific agent numbers to run
   * @returns {Promise<Object>}
   */
  async runPipeline(input, options = {}) {
    if (this.pipelineRunning) {
      throw new Error('Pipeline already running');
    }

    this.pipelineRunning = true;
    const startTime = Date.now();
    const isOffline = options.offline || false;
    const targetLayers = options.layers || LAYER_ORDER;
    const targetAgents = options.agents || null;

    console.log(`\n🔄 ═══ PIPELINE START ═══ (${isOffline ? 'OFFLINE' : 'ONLINE'} mode)`);

    const pipelineResults = {};
    let accumulatedContext = { ...input };

    try {
      for (const layerNum of targetLayers) {
        if (!LAYER_ORDER.includes(layerNum)) continue;

        let layerAgents = registry.getByLayer(layerNum);

        // Filter to specific agents if requested
        if (targetAgents) {
          layerAgents = layerAgents.filter((a) => targetAgents.includes(a.number));
        }

        if (layerAgents.length === 0) continue;

        const layerName = layerAgents[0]?.layer || `Layer ${layerNum}`;
        console.log(`\n  ── Layer ${layerNum}: ${layerName} (${layerAgents.length} agents) ──`);

        // Run all agents in this layer in parallel
        const layerResults = await Promise.allSettled(
          layerAgents.map((agent) =>
            runAgent(
              agent.name,
              () => agent.execute(accumulatedContext, { offline: isOffline }),
              options.hospitalId || 'H001'
            )
          )
        );

        // Collect results
        pipelineResults[layerNum] = {
          layer: layerName,
          agents: layerResults.map((r, i) => {
            if (r.status === 'fulfilled') return r.value;
            return {
              agentId: layerAgents[i].id,
              agentName: layerAgents[i].name,
              error: r.reason?.message || 'Unknown error',
              result: null,
            };
          }),
        };

        // Merge results into accumulated context for downstream layers
        for (const r of pipelineResults[layerNum].agents) {
          if (r.result) {
            accumulatedContext[r.agentId] = r.result;
          }
        }
      }

      const totalMs = Date.now() - startTime;
      console.log(`\n✅ ═══ PIPELINE COMPLETE ═══ (${totalMs}ms)\n`);

      this.lastPipelineResult = {
        success: true,
        totalMs,
        offline: isOffline,
        layers: pipelineResults,
        timestamp: new Date().toISOString(),
      };

      return this.lastPipelineResult;
    } catch (err) {
      console.error(`\n❌ ═══ PIPELINE ERROR ═══ ${err.message}\n`);
      throw err;
    } finally {
      this.pipelineRunning = false;
    }
  }

  /**
   * Execute a single agent by ID.
   */
  async executeAgent(agentId, input, options = {}) {
    const agent = registry.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    return runAgent(
      agent.name,
      () => agent.execute(input, options),
      options.hospitalId || 'H001'
    );
  }

  /**
   * Get orchestrator status.
   */
  getStatus() {
    return {
      pipelineRunning: this.pipelineRunning,
      lastPipelineResult: this.lastPipelineResult
        ? {
            totalMs: this.lastPipelineResult.totalMs,
            timestamp: this.lastPipelineResult.timestamp,
            offline: this.lastPipelineResult.offline,
          }
        : null,
    };
  }
}

module.exports = new AgentOrchestrator();
