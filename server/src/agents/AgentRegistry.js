// ──────────────────────────────────────────────────────────
// AgentRegistry — Central registry for all 30 UrbanCare agents
// ──────────────────────────────────────────────────────────

const LAYER_NAMES = {
  1: 'Classification',
  2: 'Extraction',
  3: 'Clinical Reasoning',
  4: 'Multimodal Image',
  5: 'Patient Workflow',
  6: 'Monitoring & Alert',
  7: 'Interaction',
  8: 'Utility',
};

const LAYER_COLORS = {
  1: '#3B82F6', // blue
  2: '#8B5CF6', // purple
  3: '#22C55E', // green
  4: '#EAB308', // yellow
  5: '#F97316', // orange
  6: '#EF4444', // red
  7: '#78716C', // brown
  8: '#6B7280', // gray
};

class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  register(agent) {
    if (this.agents.has(agent.id)) {
      console.warn(`  ⚠️ Agent "${agent.id}" already registered — overwriting`);
    }
    this.agents.set(agent.id, agent);
    return this;
  }

  get(agentId) {
    return this.agents.get(agentId) || null;
  }

  getAll() {
    return Array.from(this.agents.values());
  }

  getByLayer(layerNumber) {
    return this.getAll().filter((a) => a.layerNumber === layerNumber);
  }

  getByNumber(agentNumber) {
    return this.getAll().find((a) => a.number === agentNumber) || null;
  }

  /**
   * Returns full status of all agents grouped by layer.
   */
  getStatus() {
    const layers = {};
    for (let i = 1; i <= 8; i++) {
      const layerAgents = this.getByLayer(i);
      layers[i] = {
        name: LAYER_NAMES[i],
        color: LAYER_COLORS[i],
        agents: layerAgents.map((a) => a.getInfo()),
      };
    }
    return {
      totalAgents: this.agents.size,
      layers,
    };
  }

  /**
   * Returns architecture map for the data flow diagram.
   */
  getArchitecture() {
    return {
      name: 'UrbanCare AI — 30-Agent Architecture',
      version: '1.0.0',
      models: {
        'MedGemma 4B': 'google/medgemma-4b-it',
        'MedGemma 4B': 'google/medgemma-4b-it',
        'MedSigLIP': 'google/medsiglip-448',
        'CXR Foundation': 'google/cxr-foundation',
        'Path Foundation': 'google/path-foundation',
        'TxGemma 9B': 'google/txgemma-9b-predict',
        'TxGemma 27B': 'google/txgemma-27b-chat',
        'TxGemma 2B': 'google/txgemma-2b-predict',
        'MedASR': 'google/medasr',
        'HEAR': 'google/hear',
        'Gemini Pro': 'gemini-pro',
      },
      dataFlow: [
        { from: 'Patient Input', to: 'Classification (1-3)' },
        { from: 'Classification (1-3)', to: 'Extraction (4-10)' },
        { from: 'Extraction (4-10)', to: 'Multimodal (16-19)' },
        { from: 'Multimodal (16-19)', to: 'Clinical Reasoning (11-15)' },
        { from: 'Clinical Reasoning (11-15)', to: 'Workflow (20-23)' },
        { from: 'Workflow (20-23)', to: 'Monitoring & Alert (24-26)' },
        { from: 'Monitoring & Alert (24-26)', to: 'Interaction (27-28)' },
        { from: 'Interaction (27-28)', to: 'Utility (29-30)' },
      ],
      edgeModels: [
        'google/medgemma-4b-it (quantized GGUF)',
        'google/txgemma-2b-predict (quantized GGUF)',
      ],
      ...this.getStatus(),
    };
  }
}

// Singleton instance
const registry = new AgentRegistry();

module.exports = registry;
