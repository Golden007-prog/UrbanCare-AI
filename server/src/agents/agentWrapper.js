const { logExecution } = require('../models/AgentStatus');

/**
 * Wraps an agent execution function to monitor latency and status.
 *
 * @param {string} agentName - The name of the agent executing
 * @param {Function} agentOperation - An async function containing the actual agent logic
 * @param {string} hospitalId - The hospital context for this execution
 * @returns {Promise<any>} The result of the agent operation
 */
async function runAgent(agentName, agentOperation, hospitalId) {
  const startTime = Date.now();
  
  try {
    // Execute the agent operation
    const result = await agentOperation();
    
    // Calculate latency
    const latencyMs = Date.now() - startTime;
    
    // Log success
    logExecution({
      hospitalId,
      agentName,
      status: 'active',
      error_message: null,
      latency_ms: latencyMs
    });
    
    return result;
  } catch (error) {
    // Calculate latency even on failure
    const latencyMs = Date.now() - startTime;
    
    // Log failure
    logExecution({
      hospitalId,
      agentName,
      status: 'failed',
      error_message: error.message,
      latency_ms: latencyMs
    });
    
    // Re-throw so caller handles it
    throw error;
  }
}

module.exports = { runAgent };
