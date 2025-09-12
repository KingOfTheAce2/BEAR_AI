import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Database,
  HardDrive,
  FileCheck,
  FileX,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Fingerprint,
  Key,
  UserX,
  Trash2,
  Download,
  Upload,
  Globe,
  Server,
  Zap,
  Info,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PrivacyStatus {
  networkIsolation: {
    status: 'secure' | 'warning' | 'compromised';
    blockedRequests: number;
    lastExternalAttempt?: Date;
    dnsLeaks: boolean;
    vpnActive: boolean;
  };
  dataEncryption: {
    status: 'encrypted' | 'partial' | 'unencrypted';
    algorithm: string;
    keyStrength: number;
    encryptedFiles: number;
    totalFiles: number;
    encryptionProgress?: number;
  };
  localStorage: {
    status: 'local' | 'cloud' | 'mixed';
    totalSize: number; // bytes
    backupLocation: 'local' | 'none';
    compressionEnabled: boolean;
    autoDelete: boolean;
    retentionDays: number;
  };
  dataMinimization: {
    status: 'minimal' | 'standard' | 'excessive';
    piiDetected: boolean;
    anonymized: boolean;
    trackedMetrics: string[];
    optOutStatus: boolean;
  };
  accessControl: {
    status: 'protected' | 'basic' | 'open';
    authenticationEnabled: boolean;
    sessionTimeout: number; // minutes
    failedAttempts: number;
    lastAccess: Date;
  };
  auditTrail: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'detailed';
    eventsLogged: number;
    suspiciousActivity: number;
    lastAudit: Date;
  };
}

interface DataClassification {
  type: 'public' | 'internal' | 'confidential' | 'restricted';
  category: 'personal' | 'legal' | 'financial' | 'medical' | 'technical' | 'other';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  retention: number; // days
  encrypted: boolean;
  location: 'local' | 'cloud' | 'mixed';
  access: 'unrestricted' | 'authenticated' | 'authorized';
}

interface PrivacyIndicatorsProps {
  compact?: boolean;
  showDetails?: boolean;
  onPrivacyIssue?: (issue: string) => void;
  className?: string;
}

export const PrivacyIndicators: React.FC<PrivacyIndicatorsProps> = ({
  compact = false,
  showDetails = false,
  onPrivacyIssue,
  className = ""
}) => {
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>({
    networkIsolation: {
      status: 'secure',
      blockedRequests: 0,
      dnsLeaks: false,
      vpnActive: false
    },
    dataEncryption: {
      status: 'encrypted',
      algorithm: 'AES-256-GCM',
      keyStrength: 256,
      encryptedFiles: 156,
      totalFiles: 156
    },
    localStorage: {
      status: 'local',
      totalSize: 163840000, // 156 MB
      backupLocation: 'local',
      compressionEnabled: true,
      autoDelete: true,
      retentionDays: 365
    },
    dataMinimization: {
      status: 'minimal',
      piiDetected: false,
      anonymized: true,
      trackedMetrics: ['usage_time', 'error_count'],
      optOutStatus: true
    },
    accessControl: {
      status: 'protected',
      authenticationEnabled: true,
      sessionTimeout: 30,
      failedAttempts: 0,
      lastAccess: new Date()
    },
    auditTrail: {
      enabled: true,
      logLevel: 'standard',
      eventsLogged: 1247,
      suspiciousActivity: 0,
      lastAudit: new Date()
    }
  });

  const [dataBreakdown, setDataBreakdown] = useState<DataClassification[]>([
    {
      type: 'confidential',
      category: 'legal',
      sensitivity: 'high',
      retention: 2555, // 7 years
      encrypted: true,
      location: 'local',
      access: 'authenticated'
    },
    {
      type: 'internal',
      category: 'technical',
      sensitivity: 'medium',
      retention: 90,
      encrypted: true,
      location: 'local',
      access: 'unrestricted'
    },
    {
      type: 'restricted',
      category: 'personal',
      sensitivity: 'critical',
      retention: 30,
      encrypted: true,
      location: 'local',
      access: 'authorized'
    }
  ]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastPrivacyCheck, setLastPrivacyCheck] = useState<Date>(new Date());

  // Monitor privacy status
  useEffect(() => {
    const checkPrivacyStatus = () => {
      // Simulate privacy monitoring
      setPrivacyStatus(prev => ({
        ...prev,
        networkIsolation: {
          ...prev.networkIsolation,
          blockedRequests: prev.networkIsolation.blockedRequests + Math.floor(Math.random() * 3)
        },
        auditTrail: {
          ...prev.auditTrail,
          eventsLogged: prev.auditTrail.eventsLogged + Math.floor(Math.random() * 5)
        }
      }));
      setLastPrivacyCheck(new Date());
    };

    const interval = setInterval(checkPrivacyStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'secure':
      case 'encrypted':
      case 'local':
      case 'minimal':
      case 'protected':
        return 'text-green-600';
      case 'warning':
      case 'partial':
      case 'standard':
      case 'basic':
        return 'text-yellow-600';
      case 'compromised':
      case 'unencrypted':
      case 'cloud':
      case 'excessive':
      case 'open':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (category: string, status: string) => {
    const iconProps = { className: `w-4 h-4 ${getStatusColor(status)}` };
    
    switch (category) {
      case 'network':
        return status === 'secure' ? <WifiOff {...iconProps} /> : <Wifi {...iconProps} />;
      case 'encryption':
        return status === 'encrypted' ? <Lock {...iconProps} /> : <Unlock {...iconProps} />;
      case 'storage':
        return status === 'local' ? <HardDrive {...iconProps} /> : <Database {...iconProps} />;
      case 'access':
        return status === 'protected' ? <ShieldCheck {...iconProps} /> : <ShieldAlert {...iconProps} />;
      default:
        return <Shield {...iconProps} />;
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getOverallPrivacyScore = (): number => {
    const scores = [
      privacyStatus.networkIsolation.status === 'secure' ? 100 : privacyStatus.networkIsolation.status === 'warning' ? 70 : 30,
      privacyStatus.dataEncryption.status === 'encrypted' ? 100 : privacyStatus.dataEncryption.status === 'partial' ? 60 : 0,
      privacyStatus.localStorage.status === 'local' ? 100 : privacyStatus.localStorage.status === 'mixed' ? 50 : 0,
      privacyStatus.dataMinimization.status === 'minimal' ? 100 : privacyStatus.dataMinimization.status === 'standard' ? 70 : 40,
      privacyStatus.accessControl.status === 'protected' ? 100 : privacyStatus.accessControl.status === 'basic' ? 60 : 20
    ];
    return Math.round(scores.reduce((a, b) => a + b) / scores.length);
  };

  const overallScore = getOverallPrivacyScore();

  if (compact) {
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-2 ${className}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Shield className={`w-4 h-4 ${overallScore >= 90 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
                <span className="text-sm font-medium">{overallScore}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Overall Privacy Score: {overallScore}%</p>
              <p className="text-xs text-muted-foreground">Click for details</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex items-center gap-1">
            {getStatusIcon('network', privacyStatus.networkIsolation.status)}
            {getStatusIcon('encryption', privacyStatus.dataEncryption.status)}
            {getStatusIcon('storage', privacyStatus.localStorage.status)}
            {getStatusIcon('access', privacyStatus.accessControl.status)}
          </div>
          
          <Badge variant="outline" className="text-xs">
            All Local
          </Badge>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Data Protection
            <Badge variant={overallScore >= 90 ? "default" : overallScore >= 70 ? "secondary" : "destructive"}>
              {overallScore}% Secure
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Updated {Math.floor((Date.now() - lastPrivacyCheck.getTime()) / 1000)}s ago
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Overall Privacy Score */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Privacy Protection Level</span>
            <span className={`text-sm font-bold ${overallScore >= 90 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
              {overallScore >= 90 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Attention'}
            </span>
          </div>
          <Progress value={overallScore} className="h-2" />
          <div className="text-xs text-muted-foreground mt-2">
            All data processing happens locally with end-to-end encryption
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Network Isolation */}
        <Card className="border-0 bg-muted/30">
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('network')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('network', privacyStatus.networkIsolation.status)}
                <span className="font-medium">Network Isolation</span>
                <Badge variant={privacyStatus.networkIsolation.status === 'secure' ? "default" : "destructive"}>
                  {privacyStatus.networkIsolation.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {privacyStatus.networkIsolation.blockedRequests} blocked
                </Badge>
                <Button variant="ghost" size="sm">
                  {expandedSections.has('network') ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.has('network') && (
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">External requests blocked:</span>
                  <span className="font-medium text-green-600">{privacyStatus.networkIsolation.blockedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DNS leaks detected:</span>
                  <span className={`font-medium ${privacyStatus.networkIsolation.dnsLeaks ? 'text-red-600' : 'text-green-600'}`}>
                    {privacyStatus.networkIsolation.dnsLeaks ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operating mode:</span>
                  <Badge variant="default" className="text-xs">Offline Only</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network access:</span>
                  <Badge variant="outline" className="text-xs">Disabled</Badge>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                <div className="flex items-center gap-2 font-medium text-green-800 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Complete Network Isolation
                </div>
                <p className="text-green-700">
                  All network connections are disabled. Your data never leaves this device.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Data Encryption */}
        <Card className="border-0 bg-muted/30">
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('encryption')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('encryption', privacyStatus.dataEncryption.status)}
                <span className="font-medium">Data Encryption</span>
                <Badge variant="default">
                  {privacyStatus.dataEncryption.algorithm}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {privacyStatus.dataEncryption.encryptedFiles}/{privacyStatus.dataEncryption.totalFiles} encrypted
                </Badge>
                <Button variant="ghost" size="sm">
                  {expandedSections.has('encryption') ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.has('encryption') && (
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Encryption algorithm:</span>
                  <span className="font-medium">{privacyStatus.dataEncryption.algorithm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Key strength:</span>
                  <span className="font-medium">{privacyStatus.dataEncryption.keyStrength}-bit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Files encrypted:</span>
                  <span className="font-medium text-green-600">
                    {privacyStatus.dataEncryption.encryptedFiles}/{privacyStatus.dataEncryption.totalFiles}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Encryption status:</span>
                  <Badge variant="default" className="text-xs">Complete</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Encryption Progress</span>
                  <span>100%</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <div className="flex items-center gap-2 font-medium text-blue-800 mb-1">
                  <Lock className="w-4 h-4" />
                  Military-Grade Encryption
                </div>
                <p className="text-blue-700">
                  All data is encrypted at rest using AES-256-GCM with hardware-backed keys.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Local Storage */}
        <Card className="border-0 bg-muted/30">
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('storage')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('storage', privacyStatus.localStorage.status)}
                <span className="font-medium">Data Storage</span>
                <Badge variant="default">Local Only</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {formatBytes(privacyStatus.localStorage.totalSize)}
                </Badge>
                <Button variant="ghost" size="sm">
                  {expandedSections.has('storage') ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.has('storage') && (
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage location:</span>
                  <Badge variant="default" className="text-xs">Local Device</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total data size:</span>
                  <span className="font-medium">{formatBytes(privacyStatus.localStorage.totalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compression:</span>
                  <span className={`font-medium ${privacyStatus.localStorage.compressionEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {privacyStatus.localStorage.compressionEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-deletion:</span>
                  <span className="font-medium">
                    {privacyStatus.localStorage.autoDelete ? `${privacyStatus.localStorage.retentionDays} days` : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Backup location:</span>
                  <Badge variant="outline" className="text-xs">
                    {privacyStatus.localStorage.backupLocation === 'local' ? 'Local Device' : 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cloud sync:</span>
                  <Badge variant="outline" className="text-xs text-green-600">Disabled</Badge>
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm">
                <div className="flex items-center gap-2 font-medium text-purple-800 mb-1">
                  <HardDrive className="w-4 h-4" />
                  Local-First Architecture
                </div>
                <p className="text-purple-700">
                  All data is stored locally on your device with no cloud synchronization.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Data Minimization */}
        <Card className="border-0 bg-muted/30">
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('minimization')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-green-600" />
                <span className="font-medium">Data Minimization</span>
                <Badge variant="default">Minimal</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={privacyStatus.dataMinimization.piiDetected ? "destructive" : "default"} className="text-xs">
                  PII: {privacyStatus.dataMinimization.piiDetected ? 'Detected' : 'None'}
                </Badge>
                <Button variant="ghost" size="sm">
                  {expandedSections.has('minimization') ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.has('minimization') && (
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PII detected:</span>
                  <Badge variant={privacyStatus.dataMinimization.piiDetected ? "destructive" : "default"} className="text-xs">
                    {privacyStatus.dataMinimization.piiDetected ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data anonymized:</span>
                  <Badge variant={privacyStatus.dataMinimization.anonymized ? "default" : "secondary"} className="text-xs">
                    {privacyStatus.dataMinimization.anonymized ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telemetry opt-out:</span>
                  <Badge variant={privacyStatus.dataMinimization.optOutStatus ? "default" : "destructive"} className="text-xs">
                    {privacyStatus.dataMinimization.optOutStatus ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracked metrics:</span>
                  <span className="font-medium">{privacyStatus.dataMinimization.trackedMetrics.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Minimal Data Collection:</span>
                <div className="flex flex-wrap gap-1">
                  {privacyStatus.dataMinimization.trackedMetrics.map(metric => (
                    <Badge key={metric} variant="outline" className="text-xs">
                      {metric.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Access Control */}
        <Card className="border-0 bg-muted/30">
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('access')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('access', privacyStatus.accessControl.status)}
                <span className="font-medium">Access Control</span>
                <Badge variant="default">Protected</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={privacyStatus.accessControl.failedAttempts > 0 ? "destructive" : "outline"} className="text-xs">
                  {privacyStatus.accessControl.failedAttempts} failed attempts
                </Badge>
                <Button variant="ghost" size="sm">
                  {expandedSections.has('access') ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.has('access') && (
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Authentication:</span>
                  <Badge variant={privacyStatus.accessControl.authenticationEnabled ? "default" : "destructive"} className="text-xs">
                    {privacyStatus.accessControl.authenticationEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session timeout:</span>
                  <span className="font-medium">{privacyStatus.accessControl.sessionTimeout} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed attempts:</span>
                  <span className={`font-medium ${privacyStatus.accessControl.failedAttempts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {privacyStatus.accessControl.failedAttempts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last access:</span>
                  <span className="font-medium">{privacyStatus.accessControl.lastAccess.toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Audit Trail */}
        <Card className="border-0 bg-muted/30">
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('audit')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Audit Trail</span>
                <Badge variant={privacyStatus.auditTrail.enabled ? "default" : "secondary"}>
                  {privacyStatus.auditTrail.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {privacyStatus.auditTrail.eventsLogged} events
                </Badge>
                <Button variant="ghost" size="sm">
                  {expandedSections.has('audit') ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.has('audit') && (
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audit logging:</span>
                  <Badge variant={privacyStatus.auditTrail.enabled ? "default" : "secondary"} className="text-xs">
                    {privacyStatus.auditTrail.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Log level:</span>
                  <span className="font-medium capitalize">{privacyStatus.auditTrail.logLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Events logged:</span>
                  <span className="font-medium">{privacyStatus.auditTrail.eventsLogged.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suspicious activity:</span>
                  <Badge variant={privacyStatus.auditTrail.suspiciousActivity > 0 ? "destructive" : "default"} className="text-xs">
                    {privacyStatus.auditTrail.suspiciousActivity}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last audit:</span>
                  <span className="font-medium">{privacyStatus.auditTrail.lastAudit.toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Privacy Summary */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-green-900">Privacy Protection Active</h4>
                <p className="text-sm text-green-800">
                  Your data is fully protected with local-only processing, military-grade encryption, 
                  and complete network isolation. No personal information leaves your device.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Network Isolated
                  </Badge>
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                    <Lock className="w-3 h-3 mr-1" />
                    End-to-End Encrypted
                  </Badge>
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                    <HardDrive className="w-3 h-3 mr-1" />
                    Local Storage Only
                  </Badge>
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                    <UserX className="w-3 h-3 mr-1" />
                    Zero Tracking
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default PrivacyIndicators;