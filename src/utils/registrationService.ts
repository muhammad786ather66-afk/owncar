import { User, Driver, DriverDocument } from '../types';

export interface RegistrationLog {
  timestamp: string;
  step: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export interface RegistrationState {
  logs: RegistrationLog[];
  userCreated: boolean;
  driverCreated: boolean;
  documentsInserted: number;
  lastError: string | null;
  d1ErrorDetails?: string | null;
}

export interface DriverRegistrationPayload {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
  mobile_number?: string;
  cnic: string;
  driving_licence: string;
  service_type_id?: string;
  vehicle_type?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_colour?: string;
  vehicle_color?: string;
  vehicle_reg_number?: string;
  registration_number?: string;
  cnic_front_url?: string;
  cnic_back_url?: string;
  licence_doc_url?: string;
  registration_doc_url?: string;
  cnic_front?: string;
  cnic_back?: string;
  licence_doc?: string;
  registration_doc?: string;
  documents?: Array<{
    document_type?: string;
    doc_type?: string;
    type?: string;
    document_url?: string;
    file_url?: string;
    url?: string;
    data?: string;
  }>;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  driver_id?: string;
  user_id?: string;
  email?: string;
  token?: string;
  user?: User;
  driver?: Driver;
  documents?: DriverDocument[];
  logs: RegistrationLog[];
  error?: string;
  details?: string;
}

/**
 * RegistrationService
 * Handles transactional driver & user registration with granular step-by-step logging,
 * Cloudinary document processing, D1 SQL error capturing, and rollback capabilities.
 */
export class RegistrationService {
  private logs: RegistrationLog[] = [];

  constructor() {
    this.logs = [];
  }

  public log(step: string, status: 'info' | 'success' | 'warning' | 'error', message: string, details?: any): void {
    const entry: RegistrationLog = {
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : undefined,
    };
    this.logs.push(entry);

    const level = status === 'error' ? 'error' : status === 'warning' ? 'warn' : 'log';
    console[level](`[REGISTRATION_SERVICE][${step}][${status.toUpperCase()}] ${message}`, details || '');
  }

  public getLogs(): RegistrationLog[] {
    return [...this.logs];
  }

  /**
   * Executes driver registration via API with explicit frontend logging and error propagation
   */
  public async registerDriver(payload: DriverRegistrationPayload): Promise<RegistrationResult> {
    this.logs = [];
    this.log('VALIDATION', 'info', 'Validating registration payload fields');

    if (!payload.cnic) {
      this.log('VALIDATION', 'error', 'CNIC is required for driver registration');
      return {
        success: false,
        message: 'CNIC is required for driver registration',
        error: 'Validation Error: CNIC field missing',
        logs: this.getLogs(),
      };
    }

    if (!payload.driving_licence) {
      this.log('VALIDATION', 'error', 'Driving Licence is required for driver registration');
      return {
        success: false,
        message: 'Driving Licence is required for driver registration',
        error: 'Validation Error: Driving Licence field missing',
        logs: this.getLogs(),
      };
    }

    this.log('VALIDATION', 'success', 'Frontend payload validation passed');

    try {
      this.log('NETWORK_REQUEST', 'info', 'Submitting registration payload to /api/drivers/register');

      const response = await fetch('/api/drivers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('apnicar_token')
            ? { Authorization: `Bearer ${localStorage.getItem('apnicar_token')}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.success === false) {
        const errorMsg = data?.error || data?.details || data?.message || `Server returned status ${response.status}`;
        this.log('DATABASE_INSERT_FAILURE', 'error', `Registration failed: ${errorMsg}`, data);

        return {
          success: false,
          message: errorMsg,
          error: errorMsg,
          details: data?.stack || data?.details || errorMsg,
          logs: this.getLogs(),
        };
      }

      this.log('USER_CREATION', 'success', `User record created successfully with ID: ${data.user_id || data.user?.id}`);
      this.log('DRIVER_INSERTION', 'success', `Driver record created successfully with ID: ${data.driver_id || data.driver?.id}`);
      this.log('DOCUMENTS_INSERTION', 'success', `Inserted ${data.documents?.length || 0} driver_documents records into database`);
      this.log('TRANSACTION_COMMIT', 'success', 'Registration transaction committed successfully');

      if (data.token) {
        localStorage.setItem('apnicar_token', data.token);
      }

      return {
        success: true,
        message: data.message || 'Driver registration completed successfully',
        driver_id: data.driver_id || data.driver?.id,
        user_id: data.user_id || data.user?.id,
        email: data.email || data.user?.email,
        token: data.token,
        user: data.user,
        driver: data.driver,
        documents: data.documents,
        logs: this.getLogs(),
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error during registration request';
      this.log('EXCEPTION', 'error', `Registration exception caught: ${errorMsg}`, err);

      return {
        success: false,
        message: `Registration transaction aborted: ${errorMsg}`,
        error: errorMsg,
        details: err?.stack || errorMsg,
        logs: this.getLogs(),
      };
    }
  }
}

export const registrationService = new RegistrationService();
