"""
BEAR AI Python SDK

A comprehensive Python client library for the BEAR AI Legal Assistant API.
Provides easy-to-use methods for authentication, document management,
AI-powered analysis, and legal research.

Example usage:
    from bear_ai_sdk import BearAiClient
    
    client = BearAiClient(api_key="your-api-key")
    
    # Upload and analyze a document
    with open("contract.pdf", "rb") as f:
        document = client.upload_document(f, category="contract")
    
    analysis = client.analyze_document(document["id"], "summary")
    print(analysis["result"])
"""

import requests
import time
import json
from typing import Optional, Dict, Any, List, Union, IO
from dataclasses import dataclass
from urllib.parse import urljoin
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AuthTokens:
    """Authentication tokens"""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


@dataclass
class ApiError(Exception):
    """API error response"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    
    def __str__(self):
        return f"ApiError({self.code}): {self.message}"


@dataclass
class RateLimit:
    """Rate limit information"""
    limit: int
    remaining: int
    reset: int
    retry_after: Optional[int] = None


class BearAiClient:
    """
    BEAR AI API Client
    
    A comprehensive client for interacting with the BEAR AI Legal Assistant API.
    Supports authentication, document management, AI analysis, and legal research.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.bear-ai.com",
        version: str = "v1",
        timeout: int = 30,
        retries: int = 3,
        rate_limit_handler: Optional[callable] = None,
        error_handler: Optional[callable] = None
    ):
        """
        Initialize the BEAR AI client
        
        Args:
            api_key: API key for authentication
            base_url: Base URL for the API
            version: API version
            timeout: Request timeout in seconds
            retries: Number of retry attempts
            rate_limit_handler: Callback for rate limit events
            error_handler: Callback for error events
        """
        self.base_url = base_url.rstrip('/')
        self.version = version
        self.timeout = timeout
        self.retries = retries
        self.rate_limit_handler = rate_limit_handler
        self.error_handler = error_handler
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'bear-ai-python-sdk/1.0.0',
            'Content-Type': 'application/json'
        })
        
        if api_key:
            self.set_api_key(api_key)
        
        self._access_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
    
    def set_api_key(self, api_key: str) -> None:
        """Set API key for authentication"""
        self.session.headers['X-API-Key'] = api_key
    
    def set_tokens(self, tokens: AuthTokens) -> None:
        """Set JWT tokens for authentication"""
        self._access_token = tokens.access_token
        self._refresh_token = tokens.refresh_token
        self.session.headers['Authorization'] = f'Bearer {tokens.access_token}'
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic and error handling
        """
        url = urljoin(f"{self.base_url}/api/{self.version}/", endpoint.lstrip('/'))
        
        request_headers = {}
        if headers:
            request_headers.update(headers)
        
        # Handle multipart uploads
        if files:
            # Remove Content-Type for multipart uploads
            session_headers = self.session.headers.copy()
            if 'Content-Type' in session_headers:
                del session_headers['Content-Type']
            request_headers = {**session_headers, **request_headers}
        
        last_exception = None
        
        for attempt in range(self.retries + 1):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data if not files else None,
                    data=data if files else None,
                    params=params,
                    files=files,
                    headers=request_headers if files else headers,
                    timeout=self.timeout
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    
                    if self.rate_limit_handler:
                        self.rate_limit_handler(retry_after)
                    
                    if attempt < self.retries:
                        logger.warning(f"Rate limited. Retrying in {retry_after} seconds...")
                        time.sleep(retry_after)
                        continue
                
                # Handle token refresh for 401 errors
                if response.status_code == 401 and self._refresh_token and attempt == 0:
                    try:
                        self._refresh_access_token()
                        continue  # Retry with new token
                    except Exception as e:
                        logger.warning(f"Token refresh failed: {e}")
                
                # Parse response
                try:
                    result = response.json()
                except json.JSONDecodeError:
                    result = {'data': response.text}
                
                if not response.ok:
                    error_data = result.get('error', {})
                    error = ApiError(
                        code=error_data.get('code', 'HTTP_ERROR'),
                        message=error_data.get('message', f'HTTP {response.status_code}'),
                        details=error_data.get('details'),
                        timestamp=error_data.get('timestamp')
                    )
                    
                    if self.error_handler:
                        self.error_handler(error)
                    
                    raise error
                
                return result
                
            except requests.exceptions.RequestException as e:
                last_exception = e
                
                if attempt < self.retries:
                    delay = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Request failed, retrying in {delay} seconds... ({e})")
                    time.sleep(delay)
                    continue
        
        # All retries failed
        error = ApiError(
            code='REQUEST_FAILED',
            message=str(last_exception),
            timestamp=time.strftime('%Y-%m-%dT%H:%M:%SZ')
        )
        
        if self.error_handler:
            self.error_handler(error)
        
        raise error
    
    def _refresh_access_token(self) -> None:
        """Refresh the access token using refresh token"""
        if not self._refresh_token:
            raise ApiError('NO_REFRESH_TOKEN', 'No refresh token available')
        
        response = self._make_request(
            'POST',
            '/auth/refresh',
            data={'refreshToken': self._refresh_token}
        )
        
        tokens = AuthTokens(
            access_token=response['token'],
            refresh_token=response.get('refreshToken', self._refresh_token),
            expires_in=response['expiresIn']
        )
        
        self.set_tokens(tokens)
    
    # Authentication methods
    def login(self, email: str, password: str) -> AuthTokens:
        """
        Authenticate with email and password
        
        Args:
            email: User email address
            password: User password
            
        Returns:
            AuthTokens: Authentication tokens
        """
        response = self._make_request(
            'POST',
            '/auth/login',
            data={'email': email, 'password': password}
        )
        
        tokens = AuthTokens(
            access_token=response['token'],
            refresh_token=response['refreshToken'],
            expires_in=response['expiresIn']
        )
        
        self.set_tokens(tokens)
        return tokens
    
    def logout(self) -> Dict[str, str]:
        """Logout and invalidate tokens"""
        response = self._make_request('POST', '/auth/logout')
        
        # Clear tokens
        self._access_token = None
        self._refresh_token = None
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        return response
    
    # Chat methods
    def get_chat_sessions(
        self,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get chat sessions"""
        params = {'limit': limit, 'offset': offset}
        if category:
            params['category'] = category
        
        return self._make_request('GET', '/chat/sessions', params=params)
    
    def create_chat_session(
        self,
        title: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create a new chat session"""
        data = {'title': title}
        if category:
            data['category'] = category
        if tags:
            data['tags'] = tags
        
        return self._make_request('POST', '/chat/sessions', data=data)
    
    def get_chat_session(self, session_id: str) -> Dict[str, Any]:
        """Get a specific chat session"""
        return self._make_request('GET', f'/chat/sessions/{session_id}')
    
    def send_message(
        self,
        session_id: str,
        content: str,
        message_type: str = 'text',
        document_refs: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send a message to a chat session"""
        data = {
            'content': content,
            'type': message_type
        }
        if document_refs:
            data['documentRefs'] = document_refs
        
        return self._make_request(
            'POST',
            f'/chat/sessions/{session_id}/messages',
            data=data
        )
    
    def delete_chat_session(self, session_id: str) -> None:
        """Delete a chat session"""
        self._make_request('DELETE', f'/chat/sessions/{session_id}')
    
    # Document methods
    def get_documents(
        self,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get documents"""
        params = {'limit': limit, 'offset': offset}
        if category:
            params['category'] = category
        if status:
            params['status'] = status
        if search:
            params['search'] = search
        
        return self._make_request('GET', '/documents', params=params)
    
    def upload_document(
        self,
        file: Union[IO, str],
        category: str,
        tags: Optional[List[str]] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload a document
        
        Args:
            file: File object or file path
            category: Document category
            tags: Optional list of tags
            filename: Optional filename override
            
        Returns:
            Document metadata
        """
        if isinstance(file, str):
            with open(file, 'rb') as f:
                return self._upload_file(f, category, tags, filename or file)
        else:
            return self._upload_file(file, category, tags, filename)
    
    def _upload_file(
        self,
        file: IO,
        category: str,
        tags: Optional[List[str]] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """Internal method to upload file"""
        files = {'file': (filename, file)}
        data = {'category': category}
        
        if tags:
            for tag in tags:
                data[f'tags'] = tag
        
        return self._make_request(
            'POST',
            '/documents',
            data=data,
            files=files
        )
    
    def get_document(self, document_id: str) -> Dict[str, Any]:
        """Get document metadata"""
        return self._make_request('GET', f'/documents/{document_id}')
    
    def update_document(
        self,
        document_id: str,
        name: Optional[str] = None,
        tags: Optional[List[str]] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update document metadata"""
        data = {}
        if name:
            data['name'] = name
        if tags:
            data['tags'] = tags
        if category:
            data['category'] = category
        
        return self._make_request('PUT', f'/documents/{document_id}', data=data)
    
    def delete_document(self, document_id: str) -> None:
        """Delete a document"""
        self._make_request('DELETE', f'/documents/{document_id}')
    
    def download_document(self, document_id: str) -> bytes:
        """Download document content"""
        url = f"{self.base_url}/api/{self.version}/documents/{document_id}/download"
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.content
    
    # Search methods
    def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search legal resources"""
        data = {
            'query': query,
            'limit': limit,
            'offset': offset
        }
        if filters:
            data['filters'] = filters
        
        return self._make_request('POST', '/research/search', data=data)
    
    # Analysis methods
    def analyze_document(
        self,
        document_id: str,
        analysis_type: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a document
        
        Args:
            document_id: ID of the document to analyze
            analysis_type: Type of analysis (summary, risk_assessment, etc.)
            options: Additional analysis options
            
        Returns:
            Analysis results
        """
        data = {'type': analysis_type}
        if options:
            data['options'] = options
        
        return self._make_request(
            'POST',
            f'/analysis/documents/{document_id}',
            data=data
        )
    
    # User methods
    def get_user_profile(self) -> Dict[str, Any]:
        """Get user profile"""
        return self._make_request('GET', '/users/profile')
    
    def update_user_profile(self, **updates) -> Dict[str, Any]:
        """Update user profile"""
        return self._make_request('PUT', '/users/profile', data=updates)
    
    # System methods
    def get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        return self._make_request('GET', '/system/health')
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get detailed system status"""
        return self._make_request('GET', '/system/status')


# Convenience functions
def create_client(api_key: Optional[str] = None, **kwargs) -> BearAiClient:
    """Create a new BEAR AI client instance"""
    return BearAiClient(api_key=api_key, **kwargs)


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = BearAiClient()
    
    # Login
    try:
        tokens = client.login("attorney@lawfirm.com", "password123")
        print(f"Logged in successfully. Token expires in {tokens.expires_in} seconds.")
        
        # Upload a document
        with open("sample_contract.pdf", "rb") as file:
            document = client.upload_document(
                file=file,
                category="contract",
                tags=["employment", "confidential"]
            )
            print(f"Document uploaded: {document['name']}")
        
        # Analyze the document
        analysis = client.analyze_document(
            document_id=document["id"],
            analysis_type="summary",
            options={"detailLevel": "standard"}
        )
        print(f"Analysis complete: {analysis['result']}")
        
        # Search for similar documents
        results = client.search(
            query="employment contract terms",
            filters={"type": ["document"]},
            limit=10
        )
        print(f"Found {len(results['results'])} similar documents")
        
    except ApiError as e:
        print(f"API Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")