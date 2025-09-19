/**
 * BEAR AI Licensing System - Cryptographic Functions
 * Secure license generation, validation, and anti-tampering protection
 *
 * Build assumptions:
 * - Node-only (no DOM), cross-platform (macOS, Windows, Linux)
 * - tsconfig: { "types": ["node"], "lib": ["ES2022"], "module": "NodeNext", "moduleResolution": "NodeNext" }
 */

import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as os from 'node:os';

const bytesToEncoding = (data: Uint8Array | Buffer, encoding: BufferEncoding): string => {
  if (Buffer.isBuffer(data)) {
    return data.toString(encoding);
  }
  return Buffer.from(data).toString(encoding);
};

const bytesToHex = (data: Uint8Array | Buffer): string => bytesToEncoding(data, 'hex');
const bytesToBase64 = (data: Uint8Array | Buffer): string => bytesToEncoding(data, 'base64');
const bytesToUtf8 = (data: Uint8Array | Buffer): string => bytesToEncoding(data, 'utf8');

type JsonRecord = Record<string, unknown>;

export class LicenseCrypto {
  private static readonly HASH_ALGORITHM = 'sha256' as const;
  private static readonly KEY_SIZE = 2048;

  /**
   * Generate RSA key pair for license signing
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.KEY_SIZE,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  /**
   * Create hardware fingerprint from system information
   */
  static createHardwareFingerprint(hardwareInfo: {
    cpuId: string;
    motherboardSerial: string;
    diskSerial: string;
    macAddress: string;
    osInfo: string;
  }): string {
    const combined = [
      hardwareInfo.cpuId,
      hardwareInfo.motherboardSerial,
      hardwareInfo.diskSerial,
      hardwareInfo.macAddress,
      hardwareInfo.osInfo
    ].join('|');

    return crypto.createHash(this.HASH_ALGORITHM)
      .update(combined, 'utf8')
      .digest('hex');
  }

  /**
   * JSON stringify with stable key order
   */
  private static stableStringify(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    const sorted = (o: any): any => {
      if (o === null || typeof o !== 'object') return o;
      if (Array.isArray(o)) return o.map(sorted);
      const keys = Object.keys(o).sort();
      const out: JsonRecord = {};
      for (const k of keys) out[k] = sorted(o[k]);
      return out;
    };
    return JSON.stringify(sorted(obj));
  }

  /**
   * Sign license data with private key
  */
  static signLicense(licenseData: any, privateKey: string): string {
    const dataString = this.stableStringify(licenseData);
    const sign = crypto.createSign(this.HASH_ALGORITHM);
    sign.update(dataString);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify license signature with public key
   */
  static verifyLicense(licenseData: any, signature: string, publicKey: string): boolean {
    try {
      // Common pattern: the payload carries its own "signature" field. Exclude it.
      const { signature: _drop, ...dataToVerify } = (licenseData ?? {}) as Record<string, unknown>;
      const dataString = this.stableStringify(dataToVerify);

      const verify = crypto.createVerify(this.HASH_ALGORITHM);
      verify.update(dataString);
      verify.end();

      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      // Avoid leaking details to callers, but log for diagnostics
      // eslint-disable-next-line no-console
      console.error('License verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive license data (AES-256-GCM with PBKDF2 key)
  */
  static encryptLicenseData(
    data: string,
    password: string
  ): { encrypted: string; iv: string; salt: string } {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('license-data', 'utf8'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTagHex = bytesToHex(cipher.getAuthTag());

    return {
      encrypted: encrypted + authTagHex, // ciphertext || authTag
      iv: bytesToHex(iv),
      salt: bytesToHex(salt)
    };
  }

  /**
   * Decrypt license data (AES-256-GCM with PBKDF2 key)
   */
  static decryptLicenseData(
    encryptedData: { encrypted: string; iv: string; salt: string },
    password: string
  ): string {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

      // Last 16 bytes (32 hex chars) are the auth tag
      const encryptedText = encryptedData.encrypted.slice(0, -32);
      const authTag = Buffer.from(encryptedData.encrypted.slice(-32), 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from('license-data', 'utf8'));

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      throw new Error('Failed to decrypt license data');
    }
  }

  /**
   * Generate activation code (format: XXXX-XXXX-XXXX-XXXX, hex uppercase)
   */
  static generateActivationCode(): string {
    const segments: string[] = [];
    for (let i = 0; i < 4; i++) {
      const segment = bytesToHex(crypto.randomBytes(2)).toUpperCase();
      segments.push(segment);
    }
    return segments.join('-');
  }

  /**
   * Create tamper-resistant license hash (over critical fields)
   */
  static createLicenseHash(license: any): string {
    const criticalFields = [
      license?.id,
      license?.userId,
      license?.tier,
      license?.hardwareBinding?.fingerprint,
      license?.expiresAt,
      license?.features
    ];
    const combined = this.stableStringify(criticalFields);
    return crypto.createHash('sha512').update(combined, 'utf8').digest('hex');
  }

  /**
   * Verify license integrity with timing-safe comparison
   */
  static verifyLicenseIntegrity(license: any, expectedHash: string): boolean {
    const currentHash = this.createLicenseHash(license);
    const a = Buffer.from(currentHash, 'hex');
    const b = Buffer.from(expectedHash ?? '', 'hex');
    if (a.length !== b.length) return false; // timingSafeEqual throws if lengths differ
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Generate secure random ID (UUID v4)
   */
  static generateSecureId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create checksum for license file
   */
  static createChecksum(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Obfuscate license data for storage
   * NOTE: This is NOT cryptographic security — key+iv are bundled.
   */
  static obfuscateLicenseData(licenseData: string): string {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(licenseData, 'utf8'), cipher.final()]);

    // key || iv || ciphertext
    const combined = Buffer.concat([key, iv, encryptedBuffer]);
    return bytesToBase64(combined);
  }

  /**
   * Deobfuscate license data
   */
  static deobfuscateLicenseData(obfuscatedData: string): string {
    try {
      const combined = Buffer.from(obfuscatedData, 'base64');
      const key = combined.subarray(0, 32);
      const iv = combined.subarray(32, 48);
      const encrypted = combined.subarray(48);

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decryptedBuffer = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return bytesToUtf8(decryptedBuffer);
    } catch {
      throw new Error('Failed to deobfuscate license data');
    }
  }

  /**
   * Anti-debugging and anti-tampering checks (Node-safe)
   */
  static performSecurityChecks(): {
    codeIntegrity: boolean;
    environmentSafe: boolean;
    debuggerDetected: boolean;
    virtualMachineDetected: boolean;
    clockTampering: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // --- Debugger / inspector checks (Node) ---
    const debuggerDetected =
      process.execArgv.some(a => a.startsWith('--inspect')) ||
      process.execArgv.some(a => a.startsWith('--inspect-brk')) ||
      !!(process as any).debugPort;

    if (debuggerDetected) reasons.push('Node inspector/debug port detected');

    // --- VM checks (platform-specific heuristics) ---
    const virtualMachineDetected = detectVM(reasons);

    // --- Clock tampering (compare Date.now with performance origin) ---
    const systemTime = Date.now();
    const perfNow = performance.now();
    const origin = (performance as any).timeOrigin as number | undefined;
    // If timeOrigin is present, compare; allow generous skew for sleep/resume
    let clockTampering = false;
    if (typeof origin === 'number') {
      const diff = Math.abs(systemTime - (origin + perfNow));
      if (diff > 10_000) {
        clockTampering = true;
        reasons.push(`Large clock skew detected (${Math.round(diff)} ms)`);
      }
    }

    // --- Environment checks (basic hygiene signs) ---
    const environmentSafe = !(
      process.env.CI ||
      process.env.TERM?.toLowerCase() === 'dumb' ||
      process.env.BEAR_LIC_DISABLE_SECURITY === '1'
    );
    if (!environmentSafe) reasons.push('Environment flagged as unsafe (CI/test flags or overrides)');

    // --- Code integrity placeholder ---
    // Implement real code integrity if desired (e.g., self-hash check against embedded hash)
    const codeIntegrity = true;

    return {
      codeIntegrity,
      environmentSafe,
      debuggerDetected,
      virtualMachineDetected,
      clockTampering,
      reasons
    };
  }
}

/* ----------------------------- VM DETECTION ------------------------------ */

const VM_INDICATORS = [
  'vmware',
  'virtualbox',
  'qemu',
  'kvm',
  'xen',
  'microsoft',      // Hyper-V
  'parallels',
  'bhyve'
];

function detectVM(reasons: string[]): boolean {
  const platform = os.platform();

  try {
    if (platform === 'linux') {
      if (isVmLinux(reasons)) return true;
    } else if (platform === 'win32') {
      if (isVmWindows(reasons)) return true;
    } else if (platform === 'darwin') {
      if (isVmMac(reasons)) return true;
    }
  } catch (e) {
    reasons.push(`VM detection error: ${(e as Error).message}`);
  }

  // CPU "hypervisor" flag (Linux & macOS usually show it; Windows may not)
  try {
    const cpu = os.cpus()?.[0]?.model?.toLowerCase() ?? '';
    if (/virtualbox|vmware|qemu|kvm|xen|hyper-v|parallels/.test(cpu)) {
      reasons.push(`CPU model suggests VM: ${cpu}`);
      return true;
    }
  } catch { /* ignore */ }

  return false;
}

function isVmLinux(reasons: string[]): boolean {
  let signal = '';

  const read = (p: string) => {
    try {
      const content = readFileSync(p, { encoding: 'utf8' }) as string;
      return content.toLowerCase();
    } catch {
      return '';
    }
  };

  // DMI/SMBIOS
  const paths = [
    '/sys/class/dmi/id/sys_vendor',
    '/sys/class/dmi/id/product_name',
    '/sys/class/dmi/id/board_vendor',
    '/sys/class/dmi/id/chassis_vendor',
  ];
  for (const p of paths) signal += read(p);

  // CPU info hypervisor flag
  if (existsSync('/proc/cpuinfo')) {
    const cpuinfo = read('/proc/cpuinfo');
    if (/hypervisor/.test(cpuinfo)) {
      reasons.push('Linux CPU hypervisor flag present');
      return true;
    }
    signal += cpuinfo;
  }

  if (VM_INDICATORS.some(ind => signal.includes(ind))) {
    reasons.push('Linux DMI/SMBIOS strings indicate VM');
    return true;
  }
  return false;
}

function isVmWindows(reasons: string[]): boolean {
  const tryExec = (cmd: string) => {
    try {
      const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) as string;
      return output.toLowerCase();
    } catch {
      return '';
    }
  };

  // WMIC (deprecated but often present)
  let out = tryExec('wmic computersystem get model,manufacturer');
  out += tryExec('wmic bios get smbiosbiosversion, manufacturer');

  // Registry probe for BIOS strings (best effort)
  out += tryExec('reg query "HKLM\\HARDWARE\\DESCRIPTION\\System" /v SystemBiosVersion');

  if (VM_INDICATORS.some(ind => out.includes(ind))) {
    reasons.push('Windows WMI/registry strings indicate VM');
    return true;
  }
  return false;
}

function isVmMac(reasons: string[]): boolean {
  const tryExec = (cmd: string) => {
    try {
      const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) as string;
      return output.toLowerCase();
    } catch {
      return '';
    }
  };

  // system_profiler can be slow; keep the query minimal
  const hw = tryExec('/usr/sbin/system_profiler SPHardwareDataType');
  const sp = tryExec('/usr/sbin/system_profiler SPPCIDataType');
  const s = hw + sp;

  if (/(virtualbox|vmware|parallels)/.test(s)) {
    reasons.push('macOS system_profiler indicates VM vendor');
    return true;
  }
  return false;
}
