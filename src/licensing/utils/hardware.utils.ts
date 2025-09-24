/**
 * BEAR AI Licensing System - Hardware Utilities
 * Cross-platform hardware fingerprinting and system information collection
 */

import * as os from 'os';
import * as crypto from 'crypto';

export interface SystemInfo {
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  hostname: string;
  osVersion: string;
  nodeVersion: string;
}

export interface HardwareIdentifiers {
  cpuId: string;
  motherboardSerial: string;
  diskSerial: string;
  macAddress: string;
  biosSerial: string;
  systemUuid: string;
}

export class HardwareUtils {

  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private static generateRandomHex(bytes = 8): string {
    return this.bytesToHex(crypto.randomBytes(bytes));
  }

  private static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Get basic system information
   */
  static getSystemInfo(): SystemInfo {
    const cpus = os.cpus();

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      totalMemory: os.totalmem(),
      hostname: os.hostname(),
      osVersion: os.release(),
      nodeVersion: process.version
    };
  }

  /**
   * Get primary MAC address (non-internal, non-virtual)
   */
  static getPrimaryMacAddress(): string {
    const interfaces = os.networkInterfaces();
    const interfaceEntries = Object.entries(interfaces) as Array<[
      string,
      ReturnType<typeof os.networkInterfaces>[string]
    ]>;

    // Priority order for interface types
    const priorityPrefixes = ['eth', 'en', 'wlan', 'wifi'];

    for (const prefix of priorityPrefixes) {
      for (const [name, ifaces] of interfaceEntries) {
        if (name.toLowerCase().startsWith(prefix) && ifaces) {
          for (const iface of ifaces) {
            if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
              return iface.mac;
            }
          }
        }
      }
    }

    // Fallback to any non-internal interface
    for (const [, ifaces] of interfaceEntries) {
      if (ifaces) {
        for (const iface of ifaces) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return iface.mac;
          }
        }
      }
    }

    return 'unknown';
  }

  /**
   * Generate CPU identifier based on available information
   */
  static getCpuId(): string {
    const cpus = os.cpus();
    const cpu = cpus[0];

    if (!cpu) return 'unknown-cpu';

    // Create a consistent identifier from CPU information
    const cpuInfo = [
      cpu.model,
      cpu.speed.toString(),
      cpus.length.toString(),
      os.arch()
    ].join('|');

    return crypto.createHash('md5').update(cpuInfo).digest('hex').substring(0, 16);
  }

  /**
   * Get motherboard serial (platform-specific)
   */
  static async getMotherboardSerial(): Promise<string> {
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        return await this.getWindowsMotherboardSerial();
      } else if (platform === 'darwin') {
        return await this.getMacMotherboardSerial();
      } else if (platform === 'linux') {
        return await this.getLinuxMotherboardSerial();
      }
    } catch (error) {
      // Warning logging disabled for production
    }

    // Fallback to hostname-based identifier
    return `MB-${crypto.createHash('md5').update(os.hostname()).digest('hex').substring(0, 16)}`;
  }

  /**
   * Get disk serial (platform-specific)
   */
  static async getDiskSerial(): Promise<string> {
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        return await this.getWindowsDiskSerial();
      } else if (platform === 'darwin') {
        return await this.getMacDiskSerial();
      } else if (platform === 'linux') {
        return await this.getLinuxDiskSerial();
      }
    } catch (error) {
      // Warning logging disabled for production
    }

    // Fallback to hostname-based identifier
    return `DISK-${crypto.createHash('md5').update(os.hostname()).digest('hex').substring(0, 16)}`;
  }

  /**
   * Windows-specific hardware identification
   */
  private static async getWindowsMotherboardSerial(): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('wmic baseboard get serialnumber /value');
      const match = stdout.match(/SerialNumber=(.+)/);
      return match ? match[1].trim() : `WIN-MB-${Date.now()}`;
    } catch (error) {
      return `WIN-MB-${this.generateRandomHex()}`;
    }
  }

  private static async getWindowsDiskSerial(): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('wmic diskdrive get serialnumber /value');
      const match = stdout.match(/SerialNumber=(.+)/);
      return match ? match[1].trim() : `WIN-DISK-${Date.now()}`;
    } catch (error) {
      return `WIN-DISK-${this.generateRandomHex()}`;
    }
  }

  /**
   * macOS-specific hardware identification
   */
  private static async getMacMotherboardSerial(): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('system_profiler SPHardwareDataType | grep "Serial Number"');
      const match = stdout.match(/Serial Number \(system\): (.+)/);
      return match ? match[1].trim() : `MAC-MB-${Date.now()}`;
    } catch (error) {
      return `MAC-MB-${this.generateRandomHex()}`;
    }
  }

  private static async getMacDiskSerial(): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('system_profiler SPStorageDataType | grep "Device / Media Name"');
      const hash = crypto.createHash('md5').update(stdout).digest('hex');
      return `MAC-DISK-${hash.substring(0, 16)}`;
    } catch (error) {
      return `MAC-DISK-${this.generateRandomHex()}`;
    }
  }

  /**
   * Linux-specific hardware identification
   */
  private static async getLinuxMotherboardSerial(): Promise<string> {
    const fs = require('fs').promises;

    try {
      // Try DMI information
      const serial = await fs.readFile('/sys/class/dmi/id/board_serial', 'utf8');
      return serial.trim();
    } catch (error) {
      try {
        // Fallback to product serial
        const serial = await fs.readFile('/sys/class/dmi/id/product_serial', 'utf8');
        return serial.trim();
      } catch (error2) {
        return `LINUX-MB-${this.generateRandomHex()}`;
      }
    }
  }

  private static async getLinuxDiskSerial(): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Get the main disk (usually sda or nvme0n1)
      const { stdout } = await execAsync('lsblk -o NAME,SERIAL -d | grep -E "sda|nvme0n1" | head -1');
      const match = stdout.match(/\s+([A-Z0-9]+)\s*$/);
      return match ? match[1].trim() : `LINUX-DISK-${Date.now()}`;
    } catch (error) {
      return `LINUX-DISK-${this.generateRandomHex()}`;
    }
  }

  /**
   * Get BIOS serial (where available)
   */
  static async getBiosSerial(): Promise<string> {
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('wmic bios get serialnumber /value');
        const match = stdout.match(/SerialNumber=(.+)/);
        return match ? match[1].trim() : 'unknown-bios';
      } else if (platform === 'linux') {
        const fs = require('fs').promises;
        const serial = await fs.readFile('/sys/class/dmi/id/bios_serial', 'utf8');
        return serial.trim();
      }
    } catch (error) {
      // Fallback for platforms where BIOS info isn't available
    }

    return `BIOS-${this.generateRandomHex()}`;
  }

  /**
   * Generate system UUID
   */
  static async getSystemUuid(): Promise<string> {
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('wmic csproduct get uuid /value');
        const match = stdout.match(/UUID=(.+)/);
        return match ? match[1].trim() : crypto.randomUUID();
      } else if (platform === 'linux') {
        const fs = require('fs').promises;
        const uuid = await fs.readFile('/sys/class/dmi/id/product_uuid', 'utf8');
        return uuid.trim();
      } else if (platform === 'darwin') {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('system_profiler SPHardwareDataType | grep "Hardware UUID"');
        const match = stdout.match(/Hardware UUID: (.+)/);
        return match ? match[1].trim() : crypto.randomUUID();
      }
    } catch (error) {
      // Fallback to generated UUID
    }

    return crypto.randomUUID();
  }

  /**
   * Collect all hardware identifiers
   */
  static async collectHardwareIdentifiers(): Promise<HardwareIdentifiers> {
    const [
      cpuId,
      motherboardSerial,
      diskSerial,
      macAddress,
      biosSerial,
      systemUuid
    ] = await Promise.all([
      Promise.resolve(this.getCpuId()),
      this.getMotherboardSerial(),
      this.getDiskSerial(),
      Promise.resolve(this.getPrimaryMacAddress()),
      this.getBiosSerial(),
      this.getSystemUuid()
    ]);

    return {
      cpuId,
      motherboardSerial,
      diskSerial,
      macAddress,
      biosSerial,
      systemUuid
    };
  }

  /**
   * Create stable hardware fingerprint
   */
  static async createHardwareFingerprint(): Promise<string> {
    const identifiers = await this.collectHardwareIdentifiers();

    // Combine identifiers in a stable order
    const combined = [
      identifiers.cpuId,
      identifiers.motherboardSerial,
      identifiers.diskSerial,
      identifiers.macAddress,
      identifiers.biosSerial,
      identifiers.systemUuid
    ].join('|');

    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Validate hardware fingerprint components
   */
  static validateHardwareComponents(identifiers: HardwareIdentifiers): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 6;

    // Check each component
    if (identifiers.cpuId && identifiers.cpuId !== 'unknown-cpu') {
      score++;
    } else {
      issues.push('CPU ID not available');
    }

    if (identifiers.motherboardSerial && !identifiers.motherboardSerial.startsWith('MB-')) {
      score++;
    } else {
      issues.push('Motherboard serial not available');
    }

    if (identifiers.diskSerial && !identifiers.diskSerial.startsWith('DISK-')) {
      score++;
    } else {
      issues.push('Disk serial not available');
    }

    if (identifiers.macAddress && identifiers.macAddress !== 'unknown') {
      score++;
    } else {
      issues.push('MAC address not available');
    }

    if (identifiers.biosSerial && !identifiers.biosSerial.startsWith('BIOS-')) {
      score++;
    } else {
      issues.push('BIOS serial not available');
    }

    if (identifiers.systemUuid) {
      score++;
    } else {
      issues.push('System UUID not available');
    }

    // Consider valid if at least 50% of components are available
    const isValid = score >= Math.ceil(maxScore / 2);

    return {
      isValid,
      score: (score / maxScore) * 100,
      issues
    };
  }

  /**
   * Check if running in virtual machine
   */
  static isVirtualMachine(): boolean {
    const indicators = [
      'VMware',
      'VirtualBox',
      'QEMU',
      'KVM',
      'Xen',
      'Microsoft Corporation',
      'innotek GmbH',
      'Parallels'
    ];

    const systemInfo = this.getSystemInfo();
    const hostname = systemInfo.hostname.toLowerCase();
    const cpuModel = systemInfo.cpuModel.toLowerCase();

    return indicators.some(indicator =>
      hostname.includes(indicator.toLowerCase()) ||
      cpuModel.includes(indicator.toLowerCase())
    );
  }

  /**
   * Detect if running under debugger or development tools
   */
  static detectDebugging(): boolean {
    // Check for common debugging environment variables
    const debugVars = [
      'NODE_OPTIONS',
      'DEBUG',
      'INSPECT',
      'VSCODE_INSPECTOR_OPTIONS'
    ];

    return debugVars.some(varName => process.env[varName]);
  }

  /**
   * Get hardware trust score (0-100)
   */
  static async getHardwareTrustScore(): Promise<number> {
    const identifiers = await this.collectHardwareIdentifiers();
    const validation = this.validateHardwareComponents(identifiers);

    let score = validation.score;

    // Reduce score for virtual machines
    if (this.isVirtualMachine()) {
      score *= 0.7;
    }

    // Reduce score for debugging environments
    if (this.detectDebugging()) {
      score *= 0.8;
    }

    return Math.round(score);
  }
}