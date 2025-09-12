/**
 * Mock Tauri API for build compatibility and web environment fallback
 */

export const mockInvoke = async (command: string, payload?: any): Promise<any> => {
  console.warn(`[MOCK] Tauri invoke called: ${command}`, payload);
  
  // Return reasonable mock responses for each command type
  switch (command) {
    case 'local_system_health':
      return {
        status: 'healthy',
        local_only: true,
        web_fallback: true,
        timestamp: new Date().toISOString()
      };
      
    case 'local_auth_validate':
      return false; // No session in web mode
      
    case 'local_auth_login':
      return {
        success: false,
        error: 'Desktop authentication not available in web mode'
      };
      
    case 'local_chat_sessions':
    case 'local_documents_list':
      return [];
      
    default:
      throw new Error(`Mock Tauri command not implemented: ${command}`);
  }
};

export const mockTauriApi = {
  invoke: mockInvoke
};

export default mockTauriApi;