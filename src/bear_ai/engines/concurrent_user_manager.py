"""
Scalable Concurrent User Management System for BEAR AI
Enterprise-grade architecture for supporting multiple law firms simultaneously

Features:
- Multi-tenant isolation and security
- Session management with JWT tokens
- Resource pooling and allocation
- Load balancing and auto-scaling
- Real-time user activity tracking
- Advanced caching strategies
- Concurrent document processing
- User workspace management
- Performance monitoring per user

@version 3.0.0
@author BEAR AI Architecture Team
"""

import asyncio
import json
import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Set, Callable, Union
from collections import defaultdict, deque
import threading
import weakref
import hashlib
import jwt
from pathlib import Path

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

logger = logging.getLogger(__name__)


class UserRole(Enum):
    """User roles with different access levels"""
    SUPER_ADMIN = "super_admin"          # System administrator
    FIRM_ADMIN = "firm_admin"            # Law firm administrator
    SENIOR_ATTORNEY = "senior_attorney"   # Senior attorney with full access
    ATTORNEY = "attorney"                # Regular attorney
    PARALEGAL = "paralegal"              # Paralegal with limited access
    GUEST = "guest"                      # Read-only access
    API_USER = "api_user"                # Programmatic access


class SessionStatus(Enum):
    """User session status"""
    ACTIVE = "active"
    IDLE = "idle"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class ResourceType(Enum):
    """Types of system resources"""
    CPU_CORES = "cpu_cores"
    MEMORY_MB = "memory_mb"
    GPU_MEMORY_MB = "gpu_memory_mb"
    DISK_SPACE_MB = "disk_space_mb"
    CONCURRENT_REQUESTS = "concurrent_requests"
    DOCUMENTS_PER_HOUR = "documents_per_hour"


@dataclass
class UserProfile:
    """User profile information"""
    user_id: str
    username: str
    email: str
    role: UserRole
    firm_id: str
    firm_name: str
    subscription_tier: str = "basic"  # basic, professional, enterprise
    preferences: Dict[str, Any] = field(default_factory=dict)
    permissions: Set[str] = field(default_factory=set)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True


@dataclass
class UserSession:
    """Active user session"""
    session_id: str
    user_id: str
    user_profile: UserProfile
    created_at: datetime
    last_activity: datetime
    ip_address: str
    user_agent: str
    status: SessionStatus = SessionStatus.ACTIVE
    workspace_id: Optional[str] = None
    allocated_resources: Dict[ResourceType, int] = field(default_factory=dict)
    active_operations: Set[str] = field(default_factory=set)
    performance_metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ResourceQuota:
    """Resource quotas per subscription tier"""
    tier: str
    cpu_cores: int
    memory_mb: int
    gpu_memory_mb: int
    disk_space_mb: int
    concurrent_requests: int
    documents_per_hour: int
    max_sessions: int
    storage_limit_gb: int


@dataclass
class UserWorkspace:
    """User's isolated workspace"""
    workspace_id: str
    user_id: str
    firm_id: str
    created_at: datetime
    last_accessed: datetime
    documents: Dict[str, Any] = field(default_factory=dict)
    cached_results: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    shared_resources: Set[str] = field(default_factory=set)


class ResourceManager:
    """Manages system resource allocation across users"""
    
    def __init__(self):
        self.resource_quotas = self._initialize_quotas()
        self.allocated_resources: Dict[str, Dict[ResourceType, int]] = {}
        self.total_resources = self._detect_system_resources()
        self.resource_lock = threading.RLock()
        
    def _initialize_quotas(self) -> Dict[str, ResourceQuota]:
        """Initialize resource quotas for different subscription tiers"""
        return {
            "basic": ResourceQuota(
                tier="basic",
                cpu_cores=2,
                memory_mb=4096,
                gpu_memory_mb=2048,
                disk_space_mb=10240,  # 10GB
                concurrent_requests=5,
                documents_per_hour=50,
                max_sessions=2,
                storage_limit_gb=50
            ),
            "professional": ResourceQuota(
                tier="professional", 
                cpu_cores=4,
                memory_mb=8192,
                gpu_memory_mb=4096,
                disk_space_mb=51200,  # 50GB
                concurrent_requests=15,
                documents_per_hour=200,
                max_sessions=5,
                storage_limit_gb=200
            ),
            "enterprise": ResourceQuota(
                tier="enterprise",
                cpu_cores=8,
                memory_mb=16384,
                gpu_memory_mb=8192,
                disk_space_mb=204800,  # 200GB
                concurrent_requests=50,
                documents_per_hour=1000,
                max_sessions=20,
                storage_limit_gb=1000
            )
        }
    
    def _detect_system_resources(self) -> Dict[ResourceType, int]:
        """Detect available system resources"""
        resources = {}
        
        if PSUTIL_AVAILABLE:
            # CPU cores
            resources[ResourceType.CPU_CORES] = psutil.cpu_count(logical=True)
            
            # Memory
            memory = psutil.virtual_memory()
            resources[ResourceType.MEMORY_MB] = int(memory.total / (1024 * 1024))
            
            # Disk space (main drive)
            disk = psutil.disk_usage('/')
            resources[ResourceType.DISK_SPACE_MB] = int(disk.total / (1024 * 1024))
        else:
            # Fallback values
            resources[ResourceType.CPU_CORES] = 8
            resources[ResourceType.MEMORY_MB] = 16384
            resources[ResourceType.DISK_SPACE_MB] = 1024000
        
        # GPU memory detection (simplified)
        try:
            import torch
            if torch.cuda.is_available():
                gpu_memory = torch.cuda.get_device_properties(0).total_memory
                resources[ResourceType.GPU_MEMORY_MB] = int(gpu_memory / (1024 * 1024))
            else:
                resources[ResourceType.GPU_MEMORY_MB] = 0
        except ImportError:
            resources[ResourceType.GPU_MEMORY_MB] = 8192  # Assume 8GB
        
        # Set conservative limits for concurrent operations
        resources[ResourceType.CONCURRENT_REQUESTS] = 200
        resources[ResourceType.DOCUMENTS_PER_HOUR] = 10000
        
        return resources
    
    def allocate_resources(self, user_id: str, subscription_tier: str) -> Dict[ResourceType, int]:
        """Allocate resources to a user based on their subscription"""
        with self.resource_lock:
            quota = self.resource_quotas.get(subscription_tier, self.resource_quotas["basic"])
            
            if user_id in self.allocated_resources:
                return self.allocated_resources[user_id]
            
            allocation = {}
            
            # Check if we can allocate the requested resources
            for resource_type in ResourceType:
                requested = getattr(quota, resource_type.value, 0)
                currently_allocated = sum(
                    user_allocation.get(resource_type, 0) 
                    for user_allocation in self.allocated_resources.values()
                )
                
                available = self.total_resources.get(resource_type, 0) - currently_allocated
                
                if available >= requested:
                    allocation[resource_type] = requested
                else:
                    # Allocate what's available, with minimum guarantees
                    min_allocation = max(1, requested // 4)  # At least 25% of requested
                    allocation[resource_type] = max(min_allocation, min(available, requested))
            
            self.allocated_resources[user_id] = allocation
            return allocation
    
    def deallocate_resources(self, user_id: str):
        """Deallocate resources when user logs out"""
        with self.resource_lock:
            if user_id in self.allocated_resources:
                del self.allocated_resources[user_id]
    
    def get_resource_usage(self) -> Dict[str, Any]:
        """Get current resource usage statistics"""
        with self.resource_lock:
            usage = {}
            
            for resource_type in ResourceType:
                total = self.total_resources.get(resource_type, 0)
                allocated = sum(
                    user_allocation.get(resource_type, 0) 
                    for user_allocation in self.allocated_resources.values()
                )
                
                usage[resource_type.value] = {
                    'total': total,
                    'allocated': allocated,
                    'available': total - allocated,
                    'percentage': (allocated / total) * 100 if total > 0 else 0
                }
            
            return usage


class SessionManager:
    """Manages user sessions with JWT tokens"""
    
    def __init__(self, secret_key: str, session_timeout: int = 3600):
        self.secret_key = secret_key
        self.session_timeout = session_timeout  # seconds
        self.active_sessions: Dict[str, UserSession] = {}
        self.user_sessions: Dict[str, Set[str]] = defaultdict(set)  # user_id -> session_ids
        self.session_lock = threading.RLock()
        
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_expired_sessions())
    
    def create_session(
        self, 
        user_profile: UserProfile, 
        ip_address: str, 
        user_agent: str
    ) -> tuple[str, str]:  # (session_id, jwt_token)
        """Create a new user session"""
        with self.session_lock:
            session_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Create JWT token
            payload = {
                'session_id': session_id,
                'user_id': user_profile.user_id,
                'firm_id': user_profile.firm_id,
                'role': user_profile.role.value,
                'iat': now,
                'exp': now + timedelta(seconds=self.session_timeout)
            }
            
            jwt_token = jwt.encode(payload, self.secret_key, algorithm='HS256')
            
            # Create session
            session = UserSession(
                session_id=session_id,
                user_id=user_profile.user_id,
                user_profile=user_profile,
                created_at=now,
                last_activity=now,
                ip_address=ip_address,
                user_agent=user_agent,
                workspace_id=f"workspace_{user_profile.user_id}_{int(time.time())}"
            )
            
            self.active_sessions[session_id] = session
            self.user_sessions[user_profile.user_id].add(session_id)
            
            return session_id, jwt_token
    
    def validate_session(self, jwt_token: str) -> Optional[UserSession]:
        """Validate JWT token and return session"""
        try:
            payload = jwt.decode(jwt_token, self.secret_key, algorithms=['HS256'])
            session_id = payload.get('session_id')
            
            with self.session_lock:
                session = self.active_sessions.get(session_id)
                
                if session and session.status == SessionStatus.ACTIVE:
                    # Update last activity
                    session.last_activity = datetime.utcnow()
                    return session
                
                return None
                
        except jwt.ExpiredSignatureError:
            # Token expired
            return None
        except jwt.InvalidTokenError:
            # Invalid token
            return None
    
    def terminate_session(self, session_id: str):
        """Terminate a specific session"""
        with self.session_lock:
            session = self.active_sessions.get(session_id)
            if session:
                session.status = SessionStatus.TERMINATED
                user_id = session.user_id
                
                del self.active_sessions[session_id]
                self.user_sessions[user_id].discard(session_id)
    
    def terminate_user_sessions(self, user_id: str):
        """Terminate all sessions for a user"""
        with self.session_lock:
            session_ids = self.user_sessions.get(user_id, set()).copy()
            for session_id in session_ids:
                self.terminate_session(session_id)
    
    def get_active_sessions(self) -> List[UserSession]:
        """Get all active sessions"""
        with self.session_lock:
            return [s for s in self.active_sessions.values() if s.status == SessionStatus.ACTIVE]
    
    def get_user_sessions(self, user_id: str) -> List[UserSession]:
        """Get active sessions for a specific user"""
        with self.session_lock:
            session_ids = self.user_sessions.get(user_id, set())
            return [
                self.active_sessions[sid] 
                for sid in session_ids 
                if sid in self.active_sessions and self.active_sessions[sid].status == SessionStatus.ACTIVE
            ]
    
    async def _cleanup_expired_sessions(self):
        """Background task to clean up expired sessions"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                now = datetime.utcnow()
                expired_sessions = []
                
                with self.session_lock:
                    for session_id, session in self.active_sessions.items():
                        if session.status == SessionStatus.ACTIVE:
                            # Check if session expired
                            if (now - session.last_activity).total_seconds() > self.session_timeout:
                                expired_sessions.append(session_id)
                
                # Terminate expired sessions
                for session_id in expired_sessions:
                    self.terminate_session(session_id)
                    logger.info(f"Expired session terminated: {session_id}")
                    
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")


class WorkspaceManager:
    """Manages user workspaces and data isolation"""
    
    def __init__(self, base_storage_path: Path):
        self.base_storage_path = base_storage_path
        self.active_workspaces: Dict[str, UserWorkspace] = {}
        self.workspace_lock = threading.RLock()
        
        # Ensure storage directory exists
        self.base_storage_path.mkdir(parents=True, exist_ok=True)
    
    def get_workspace(self, user_id: str, firm_id: str) -> UserWorkspace:
        """Get or create user workspace"""
        workspace_id = f"workspace_{user_id}_{firm_id}"
        
        with self.workspace_lock:
            if workspace_id in self.active_workspaces:
                workspace = self.active_workspaces[workspace_id]
                workspace.last_accessed = datetime.utcnow()
                return workspace
            
            # Load or create workspace
            workspace_path = self.base_storage_path / firm_id / user_id
            workspace_path.mkdir(parents=True, exist_ok=True)
            
            workspace = UserWorkspace(
                workspace_id=workspace_id,
                user_id=user_id,
                firm_id=firm_id,
                created_at=datetime.utcnow(),
                last_accessed=datetime.utcnow()
            )
            
            # Load existing data if available
            self._load_workspace_data(workspace, workspace_path)
            
            self.active_workspaces[workspace_id] = workspace
            return workspace
    
    def save_workspace(self, workspace: UserWorkspace):
        """Save workspace data to persistent storage"""
        workspace_path = self.base_storage_path / workspace.firm_id / workspace.user_id
        workspace_path.mkdir(parents=True, exist_ok=True)
        
        # Save workspace metadata
        metadata_file = workspace_path / "workspace.json"
        metadata = {
            'workspace_id': workspace.workspace_id,
            'user_id': workspace.user_id,
            'firm_id': workspace.firm_id,
            'created_at': workspace.created_at.isoformat(),
            'last_accessed': workspace.last_accessed.isoformat(),
            'preferences': workspace.preferences,
            'shared_resources': list(workspace.shared_resources)
        }
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save documents metadata (actual documents stored separately)
        if workspace.documents:
            documents_file = workspace_path / "documents.json"
            with open(documents_file, 'w') as f:
                json.dump(workspace.documents, f, indent=2)
    
    def _load_workspace_data(self, workspace: UserWorkspace, workspace_path: Path):
        """Load workspace data from persistent storage"""
        try:
            metadata_file = workspace_path / "workspace.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                workspace.preferences = metadata.get('preferences', {})
                workspace.shared_resources = set(metadata.get('shared_resources', []))
            
            documents_file = workspace_path / "documents.json"
            if documents_file.exists():
                with open(documents_file, 'r') as f:
                    workspace.documents = json.load(f)
                    
        except Exception as e:
            logger.error(f"Failed to load workspace data: {e}")
    
    def cleanup_inactive_workspaces(self, max_age_hours: int = 24):
        """Clean up workspaces that haven't been accessed recently"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        inactive_workspaces = []
        
        with self.workspace_lock:
            for workspace_id, workspace in self.active_workspaces.items():
                if workspace.last_accessed < cutoff_time:
                    inactive_workspaces.append(workspace_id)
        
        for workspace_id in inactive_workspaces:
            workspace = self.active_workspaces[workspace_id]
            self.save_workspace(workspace)  # Save before removing
            del self.active_workspaces[workspace_id]
            logger.info(f"Cleaned up inactive workspace: {workspace_id}")


class ConcurrentUserManager:
    """Main manager for handling concurrent users in BEAR AI"""
    
    def __init__(
        self, 
        secret_key: str, 
        storage_path: Path,
        session_timeout: int = 3600,
        redis_url: Optional[str] = None
    ):
        self.secret_key = secret_key
        self.storage_path = storage_path
        self.session_timeout = session_timeout
        
        # Initialize components
        self.resource_manager = ResourceManager()
        self.session_manager = SessionManager(secret_key, session_timeout)
        self.workspace_manager = WorkspaceManager(storage_path)
        
        # User profiles (in production, load from database)
        self.user_profiles: Dict[str, UserProfile] = {}
        
        # Performance tracking
        self.performance_metrics = {
            'total_logins': 0,
            'active_users': 0,
            'peak_concurrent_users': 0,
            'total_sessions_created': 0,
            'total_documents_processed': 0,
            'average_session_duration': 0
        }
        
        # Redis for distributed session management (optional)
        self.redis_client = None
        if redis_url and REDIS_AVAILABLE:
            try:
                import redis
                self.redis_client = redis.from_url(redis_url)
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
        
        logger.info("Concurrent User Manager initialized")
    
    async def authenticate_user(
        self, 
        username: str, 
        password: str, 
        ip_address: str, 
        user_agent: str
    ) -> tuple[Optional[str], Optional[UserProfile]]:
        """Authenticate user and create session"""
        
        # In production, validate against secure database
        user_profile = await self._validate_credentials(username, password)
        if not user_profile:
            return None, None
        
        # Check if user can create new session (subscription limits)
        current_sessions = self.session_manager.get_user_sessions(user_profile.user_id)
        quota = self.resource_manager.resource_quotas.get(
            user_profile.subscription_tier, 
            self.resource_manager.resource_quotas["basic"]
        )
        
        if len(current_sessions) >= quota.max_sessions:
            # Terminate oldest session to make room
            if current_sessions:
                oldest_session = min(current_sessions, key=lambda s: s.created_at)
                self.session_manager.terminate_session(oldest_session.session_id)
        
        # Allocate resources
        self.resource_manager.allocate_resources(user_profile.user_id, user_profile.subscription_tier)
        
        # Create session
        session_id, jwt_token = self.session_manager.create_session(
            user_profile, ip_address, user_agent
        )
        
        # Get workspace
        workspace = self.workspace_manager.get_workspace(user_profile.user_id, user_profile.firm_id)
        
        # Update session with workspace
        session = self.session_manager.active_sessions[session_id]
        session.workspace_id = workspace.workspace_id
        
        # Update metrics
        self.performance_metrics['total_logins'] += 1
        self.performance_metrics['total_sessions_created'] += 1
        self.performance_metrics['active_users'] = len(self.session_manager.get_active_sessions())
        self.performance_metrics['peak_concurrent_users'] = max(
            self.performance_metrics['peak_concurrent_users'],
            self.performance_metrics['active_users']
        )
        
        # Update user's last login
        user_profile.last_login = datetime.utcnow()
        
        return jwt_token, user_profile
    
    async def _validate_credentials(self, username: str, password: str) -> Optional[UserProfile]:
        """Validate user credentials (mock implementation)"""
        # In production, this would validate against a secure database
        # with proper password hashing (bcrypt, scrypt, etc.)
        
        # Mock user for demonstration
        if username == "demo@lawfirm.com" and password == "demo123":
            return UserProfile(
                user_id="user_12345",
                username=username,
                email=username,
                role=UserRole.ATTORNEY,
                firm_id="firm_abc123",
                firm_name="Demo Law Firm",
                subscription_tier="professional",
                permissions={
                    "document.read", "document.write", "document.analyze",
                    "model.inference", "search.advanced"
                }
            )
        
        return None
    
    def validate_request(self, jwt_token: str) -> Optional[UserSession]:
        """Validate incoming request with JWT token"""
        return self.session_manager.validate_session(jwt_token)
    
    def logout_user(self, session_id: str):
        """Log out user and clean up resources"""
        session = self.session_manager.active_sessions.get(session_id)
        if session:
            # Save workspace
            workspace = self.workspace_manager.active_workspaces.get(session.workspace_id)
            if workspace:
                self.workspace_manager.save_workspace(workspace)
            
            # Deallocate resources
            self.resource_manager.deallocate_resources(session.user_id)
            
            # Terminate session
            self.session_manager.terminate_session(session_id)
            
            # Update metrics
            self.performance_metrics['active_users'] = len(self.session_manager.get_active_sessions())
    
    def get_user_workspace(self, session: UserSession) -> UserWorkspace:
        """Get user's workspace"""
        return self.workspace_manager.get_workspace(session.user_id, session.user_profile.firm_id)
    
    def track_operation(self, session_id: str, operation_id: str, operation_type: str):
        """Track user operation for monitoring"""
        session = self.session_manager.active_sessions.get(session_id)
        if session:
            session.active_operations.add(operation_id)
            
            # Update performance metrics
            if operation_type == "document_processing":
                self.performance_metrics['total_documents_processed'] += 1
    
    def complete_operation(self, session_id: str, operation_id: str):
        """Mark operation as completed"""
        session = self.session_manager.active_sessions.get(session_id)
        if session:
            session.active_operations.discard(operation_id)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status"""
        active_sessions = self.session_manager.get_active_sessions()
        
        # Calculate average session duration
        total_duration = 0
        active_count = 0
        for session in active_sessions:
            if session.status == SessionStatus.ACTIVE:
                duration = (datetime.utcnow() - session.created_at).total_seconds()
                total_duration += duration
                active_count += 1
        
        avg_duration = total_duration / active_count if active_count > 0 else 0
        self.performance_metrics['average_session_duration'] = avg_duration
        
        return {
            'active_users': len(active_sessions),
            'active_sessions': len(active_sessions),
            'resource_usage': self.resource_manager.get_resource_usage(),
            'performance_metrics': self.performance_metrics,
            'subscription_distribution': self._get_subscription_distribution(active_sessions),
            'firm_distribution': self._get_firm_distribution(active_sessions),
            'active_operations': sum(len(s.active_operations) for s in active_sessions),
            'system_health': self._calculate_system_health()
        }
    
    def _get_subscription_distribution(self, sessions: List[UserSession]) -> Dict[str, int]:
        """Get distribution of users by subscription tier"""
        distribution = defaultdict(int)
        for session in sessions:
            distribution[session.user_profile.subscription_tier] += 1
        return dict(distribution)
    
    def _get_firm_distribution(self, sessions: List[UserSession]) -> Dict[str, int]:
        """Get distribution of users by law firm"""
        distribution = defaultdict(int)
        for session in sessions:
            distribution[session.user_profile.firm_name] += 1
        return dict(distribution)
    
    def _calculate_system_health(self) -> float:
        """Calculate overall system health score (0-100)"""
        resource_usage = self.resource_manager.get_resource_usage()
        
        # Calculate health based on resource utilization
        health_factors = []
        
        for resource_type, usage in resource_usage.items():
            utilization = usage['percentage']
            
            # Health decreases as utilization increases
            if utilization < 50:
                factor = 100
            elif utilization < 70:
                factor = 90
            elif utilization < 85:
                factor = 70
            elif utilization < 95:
                factor = 40
            else:
                factor = 10
            
            health_factors.append(factor)
        
        # Average health across all resources
        return sum(health_factors) / len(health_factors) if health_factors else 100
    
    async def scale_resources(self, scale_factor: float = 1.2):
        """Dynamically scale resources based on demand"""
        current_usage = self.resource_manager.get_resource_usage()
        
        # Check if scaling is needed
        needs_scaling = any(
            usage['percentage'] > 80 
            for usage in current_usage.values()
        )
        
        if needs_scaling:
            logger.info(f"Scaling resources by factor {scale_factor}")
            
            # In a cloud environment, this would trigger auto-scaling
            # For now, we adjust internal limits
            for resource_type in ResourceType:
                current = self.resource_manager.total_resources.get(resource_type, 0)
                new_limit = int(current * scale_factor)
                self.resource_manager.total_resources[resource_type] = new_limit
            
            logger.info("Resource scaling completed")
    
    async def cleanup_and_maintenance(self):
        """Perform periodic cleanup and maintenance"""
        try:
            # Clean up inactive workspaces
            self.workspace_manager.cleanup_inactive_workspaces(24)
            
            # Save all active workspaces
            for workspace in self.workspace_manager.active_workspaces.values():
                self.workspace_manager.save_workspace(workspace)
            
            # Check for resource scaling needs
            await self.scale_resources()
            
            logger.info("Cleanup and maintenance completed")
            
        except Exception as e:
            logger.error(f"Maintenance error: {e}")


# Factory function
def create_user_manager(
    secret_key: str,
    storage_path: str,
    session_timeout: int = 3600,
    redis_url: Optional[str] = None
) -> ConcurrentUserManager:
    """Create and configure concurrent user manager"""
    
    return ConcurrentUserManager(
        secret_key=secret_key,
        storage_path=Path(storage_path),
        session_timeout=session_timeout,
        redis_url=redis_url
    )


# Example usage
async def example_usage():
    """Example of how to use the concurrent user manager"""
    
    # Create manager
    manager = create_user_manager(
        secret_key="your-secret-key-here",
        storage_path="/data/bear-ai/workspaces",
        session_timeout=7200  # 2 hours
    )
    
    # Authenticate user
    token, profile = await manager.authenticate_user(
        username="demo@lawfirm.com",
        password="demo123",
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0..."
    )
    
    if token and profile:
        print(f"User authenticated: {profile.username}")
        
        # Validate subsequent requests
        session = manager.validate_request(token)
        if session:
            print(f"Request validated for user: {session.user_profile.username}")
            
            # Get user workspace
            workspace = manager.get_user_workspace(session)
            print(f"User workspace: {workspace.workspace_id}")
            
            # Track operation
            operation_id = "doc_analysis_123"
            manager.track_operation(session.session_id, operation_id, "document_processing")
            
            # Simulate work...
            await asyncio.sleep(1)
            
            # Complete operation
            manager.complete_operation(session.session_id, operation_id)
            
            # Get system status
            status = manager.get_system_status()
            print(f"System health: {status['system_health']:.1f}%")
            
            # Logout
            manager.logout_user(session.session_id)
            print("User logged out")


if __name__ == "__main__":
    asyncio.run(example_usage())