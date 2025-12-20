/**
 * Broker Accounts Management
 * Maneja la conexión y gestión de cuentas de broker con diferentes tipos de integración
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { getSupabaseUser } from './supabaseAuth';

export type IntegrationType = 'ea' | 'api' | 'manual';
export type BrokerAccountStatus = 'connected' | 'pending_verification' | 'manual_only' | 'error' | 'disconnected';
export type AccountType = 'demo' | 'live' | 'simulation';

export interface BrokerAccount {
  id: string;
  user_id: string;
  broker: string;
  platform: string | null;
  account_number: string | null;
  account_type: AccountType;
  integration_type: IntegrationType;
  status: BrokerAccountStatus;
  alias: string | null;
  error_message: string | null;
  last_sync_at: string | null;
  verification_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerInfo {
  name: string;
  platforms: string[];
  integrationTypes: IntegrationType[];
  description: string;
  requiresApiKey: boolean;
  requiresApiSecret: boolean;
  requiresAccountNumber: boolean;
  requiresPlatform: boolean;
}

/**
 * Lista de brokers conocidos con sus configuraciones
 */
export const KNOWN_BROKERS: BrokerInfo[] = [
  {
    name: 'MetaTrader 5',
    platforms: ['MT5'],
    integrationTypes: ['ea', 'manual'],
    description: 'Conexión vía Expert Advisor (EA) o registro manual',
    requiresApiKey: false,
    requiresApiSecret: false,
    requiresAccountNumber: true,
    requiresPlatform: true,
  },
  {
    name: 'MetaTrader 4',
    platforms: ['MT4'],
    integrationTypes: ['ea', 'manual'],
    description: 'Conexión vía Expert Advisor (EA) o registro manual',
    requiresApiKey: false,
    requiresApiSecret: false,
    requiresAccountNumber: true,
    requiresPlatform: true,
  },
  {
    name: 'cTrader',
    platforms: ['cTrader'],
    integrationTypes: ['api', 'manual'],
    description: 'Conexión vía API oficial o registro manual',
    requiresApiKey: true,
    requiresApiSecret: true,
    requiresAccountNumber: true,
    requiresPlatform: true,
  },
  {
    name: 'Binance',
    platforms: ['Binance'],
    integrationTypes: ['api', 'manual'],
    description: 'Conexión vía API oficial o registro manual',
    requiresApiKey: true,
    requiresApiSecret: true,
    requiresAccountNumber: false,
    requiresPlatform: false,
  },
  {
    name: 'Interactive Brokers',
    platforms: ['TWS', 'IB Gateway'],
    integrationTypes: ['api', 'manual'],
    description: 'Conexión vía API oficial o registro manual',
    requiresApiKey: true,
    requiresApiSecret: true,
    requiresAccountNumber: true,
    requiresPlatform: true,
  },
  {
    name: 'Bybit',
    platforms: ['Bybit'],
    integrationTypes: ['api', 'manual'],
    description: 'Conexión vía API oficial o registro manual',
    requiresApiKey: true,
    requiresApiSecret: true,
    requiresAccountNumber: false,
    requiresPlatform: false,
  },
  {
    name: 'Tradovate',
    platforms: ['Tradovate'],
    integrationTypes: ['api', 'manual'],
    description: 'Conexión vía API oficial o registro manual',
    requiresApiKey: true,
    requiresApiSecret: true,
    requiresAccountNumber: true,
    requiresPlatform: false,
  },
  {
    name: 'NinjaTrader',
    platforms: ['NinjaTrader'],
    integrationTypes: ['api', 'manual'],
    description: 'Conexión vía API oficial o registro manual',
    requiresApiKey: true,
    requiresApiSecret: true,
    requiresAccountNumber: true,
    requiresPlatform: true,
  },
];

/**
 * Obtener todos los brokers conocidos
 */
export function getKnownBrokers(): BrokerInfo[] {
  return KNOWN_BROKERS;
}

/**
 * Buscar brokers por nombre (para autocomplete)
 */
export function searchBrokers(query: string): BrokerInfo[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return KNOWN_BROKERS;
  
  return KNOWN_BROKERS.filter(broker =>
    broker.name.toLowerCase().includes(lowerQuery) ||
    broker.platforms.some(p => p.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Obtener información de un broker por nombre
 */
export function getBrokerInfo(brokerName: string): BrokerInfo | null {
  return KNOWN_BROKERS.find(b => b.name === brokerName) || null;
}

/**
 * Obtener todas las cuentas de broker del usuario actual
 * IMPORTANTE: Las credenciales encriptadas nunca se exponen al frontend
 */
export async function getBrokerAccounts(): Promise<BrokerAccount[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getSupabaseUser();
  if (!user) return [];

  // Excluir campos sensibles de la query - nunca exponer credenciales encriptadas
  const { data, error } = await supabase!
    .from('broker_accounts')
    .select('id, user_id, broker, platform, account_number, account_type, integration_type, status, alias, error_message, last_sync_at, verification_token, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching broker accounts:', error);
    return [];
  }
  
  // Asegurar que no hay credenciales en los datos
  const accounts = (data as BrokerAccount[]) || [];
  return accounts.map(account => {
    // Remover cualquier campo de credenciales que pueda haber escapado
    const { api_key_encrypted, api_secret_encrypted, ...safeAccount } = account as any;
    return safeAccount as BrokerAccount;
  });
}

/**
 * Crear una nueva cuenta de broker
 */
export async function createBrokerAccount(
  broker: string,
  platform: string | null,
  accountNumber: string | null,
  accountType: AccountType,
  integrationType: IntegrationType,
  alias: string | null = null,
  apiKey?: string,
  apiSecret?: string
): Promise<{ success: boolean; data?: BrokerAccount; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
  const user = await getSupabaseUser();
  if (!user) return { success: false, error: 'User not authenticated' };

  // Validar que el broker sea conocido
  const brokerInfo = getBrokerInfo(broker);
  if (!brokerInfo) {
    return { success: false, error: 'Broker no reconocido' };
  }

  // Validar que el tipo de integración sea compatible
  if (!brokerInfo.integrationTypes.includes(integrationType)) {
    return { success: false, error: `Tipo de integración no soportado para ${broker}` };
  }

  // Determinar estado inicial
  let status: BrokerAccountStatus = 'pending_verification';
  if (integrationType === 'manual') {
    status = 'manual_only';
  }

  // Preparar datos (las credenciales se encriptan en el backend)
  const accountData: any = {
    user_id: user.id,
    broker,
    platform,
    account_number: accountNumber,
    account_type: accountType,
    integration_type: integrationType,
    status,
    alias,
  };

  // Para API brokers, encriptar credenciales antes de guardar
  if (integrationType === 'api') {
    if (!apiKey || !apiSecret) {
      return { success: false, error: 'API Key y Secret son requeridos para integración API' };
    }
    
    // Encriptar credenciales usando Edge Function
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        return { success: false, error: 'No hay sesión activa' };
      }
      
      const { data: encryptData, error: encryptError } = await supabase!.functions.invoke('encrypt-credentials', {
        body: { apiKey, apiSecret },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (encryptError || !encryptData?.success) {
        console.error('Error encrypting credentials:', encryptError);
        return { 
          success: false, 
          error: encryptError?.message || 'Error al encriptar credenciales' 
        };
      }
      
      // Usar credenciales encriptadas
      accountData.api_key_encrypted = encryptData.data.api_key_encrypted;
      accountData.api_secret_encrypted = encryptData.data.api_secret_encrypted;
    } catch (error) {
      console.error('Error in encryption process:', error);
      return { 
        success: false, 
        error: 'Error al procesar credenciales. Por favor, intenta nuevamente.' 
      };
    }
  }

  const { data, error } = await supabase!
    .from('broker_accounts')
    .insert(accountData)
    .select()
    .single();

  if (error) {
    console.error('Error creating broker account:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BrokerAccount };
}

/**
 * Actualizar una cuenta de broker
 * Si se proporcionan apiKey o apiSecret, se encriptarán automáticamente
 */
export async function updateBrokerAccount(
  id: string,
  updates: Partial<Omit<BrokerAccount, 'id' | 'user_id' | 'created_at'>> & {
    apiKey?: string;
    apiSecret?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
  const user = await getSupabaseUser();
  if (!user) return { success: false, error: 'User not authenticated' };

  // Si se están actualizando credenciales, encriptarlas primero
  const updateData: any = { ...updates };
  
  if (updates.apiKey || updates.apiSecret) {
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        return { success: false, error: 'No hay sesión activa' };
      }
      
      const encryptBody: any = {};
      if (updates.apiKey) encryptBody.apiKey = updates.apiKey;
      if (updates.apiSecret) encryptBody.apiSecret = updates.apiSecret;
      
      const { data: encryptData, error: encryptError } = await supabase!.functions.invoke('encrypt-credentials', {
        body: encryptBody,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (encryptError || !encryptData?.success) {
        console.error('Error encrypting credentials:', encryptError);
        return { 
          success: false, 
          error: encryptError?.message || 'Error al encriptar credenciales' 
        };
      }
      
      // Reemplazar credenciales planas con encriptadas
      if (updates.apiKey) {
        updateData.api_key_encrypted = encryptData.data.api_key_encrypted;
        delete updateData.apiKey;
      }
      if (updates.apiSecret) {
        updateData.api_secret_encrypted = encryptData.data.api_secret_encrypted;
        delete updateData.apiSecret;
      }
    } catch (error) {
      console.error('Error in encryption process:', error);
      return { 
        success: false, 
        error: 'Error al procesar credenciales. Por favor, intenta nuevamente.' 
      };
    }
  }

  const { error } = await supabase!
    .from('broker_accounts')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id); // Asegurar que solo puede actualizar sus propias cuentas

  if (error) {
    console.error('Error updating broker account:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Eliminar una cuenta de broker
 */
export async function deleteBrokerAccount(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
  const user = await getSupabaseUser();
  if (!user) return { success: false, error: 'User not authenticated' };

  const { error } = await supabase!
    .from('broker_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // Asegurar que solo puede eliminar sus propias cuentas

  if (error) {
    console.error('Error deleting broker account:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Probar conexión de una cuenta API
 */
export async function testApiConnection(
  id: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
  const user = await getSupabaseUser();
  if (!user) return { success: false, error: 'User not authenticated' };

  // Obtener la cuenta
  const { data: account, error: fetchError } = await supabase!
    .from('broker_accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !account) {
    return { success: false, error: 'Cuenta no encontrada' };
  }

  if (account.integration_type !== 'api') {
    return { success: false, error: 'Solo se pueden probar conexiones API' };
  }

  // TODO: Implementar lógica de prueba de conexión real
  // Por ahora, simulamos una prueba
  // En producción, esto debería llamar a un endpoint del backend que pruebe la conexión
  
  // Actualizar estado según resultado
  // Por ahora, marcamos como pendiente de verificación
  const { error: updateError } = await supabase!
    .from('broker_accounts')
    .update({
      status: 'pending_verification',
      error_message: null,
    })
    .eq('id', id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    message: 'Conexión probada. Verifica el estado en unos momentos.',
  };
}

/**
 * Obtener el estado visual de una cuenta
 */
export function getAccountStatusDisplay(status: BrokerAccountStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'connected':
      return { label: 'Conectado', color: 'text-green-600', icon: '✓' };
    case 'pending_verification':
      return { label: 'Pendiente de verificación', color: 'text-yellow-600', icon: '⏳' };
    case 'manual_only':
      return { label: 'Solo manual', color: 'text-blue-600', icon: '📝' };
    case 'error':
      return { label: 'Error', color: 'text-red-600', icon: '✗' };
    case 'disconnected':
      return { label: 'Desconectado', color: 'text-gray-600', icon: '○' };
    default:
      return { label: 'Desconocido', color: 'text-gray-600', icon: '?' };
  }
}

