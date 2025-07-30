"""
AI Input Validation Middleware - Bank-Grade Security
Prevents AI model inference poisoning and injection attacks
"""

import re
import json
import hashlib
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from fastapi import HTTPException, Request
from pydantic import BaseModel, ValidationError, validator
import bleach
from decimal import Decimal, InvalidOperation
import structlog

logger = structlog.get_logger()

@dataclass
class ValidationResult:
    is_valid: bool
    sanitized_data: Optional[Dict[str, Any]] = None
    violations: List[str] = None
    risk_score: float = 0.0

class AIInputValidator:
    """Bank-grade input validation for AI inference requests"""
    
    # Maximum input sizes
    MAX_TEXT_LENGTH = 10000
    MAX_ARRAY_SIZE = 1000
    MAX_NESTED_DEPTH = 5
    MAX_REQUEST_SIZE = 1048576  # 1MB
    
    # Dangerous patterns that could indicate injection attempts
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'on\w+\s*=',
        r'eval\s*\(',
        r'Function\s*\(',
        r'setTimeout\s*\(',
        r'setInterval\s*\(',
        r'\$\{.*\}',  # Template literals
        r'`.*`',      # Backticks
        r'\\x[0-9a-fA-F]{2}',  # Hex encoding
        r'\\u[0-9a-fA-F]{4}',  # Unicode encoding
        r'<!--.*-->',          # HTML comments
        r'/\*.*?\*/',         # Block comments
        r'DROP\s+TABLE',      # SQL injection
        r'UNION\s+SELECT',    # SQL injection
        r'INSERT\s+INTO',     # SQL injection
        r'DELETE\s+FROM',     # SQL injection
        r'UPDATE\s+.*SET',    # SQL injection
        r'ALTER\s+TABLE',     # SQL injection
        r'CREATE\s+TABLE',    # SQL injection
        r'--\s*$',            # SQL comment
        r';.*--',             # SQL injection with comment
        r'\bEXEC\b',          # Command execution
        r'\bSYSTEM\b',        # System calls
        r'\b__import__\b',    # Python imports
        r'\bgetattr\b',       # Python reflection
        r'\bsetattr\b',       # Python reflection
        r'\bhasattr\b',       # Python reflection
        r'\bdir\b\s*\(',      # Python introspection
        r'\bvars\b\s*\(',     # Python introspection
        r'\blocals\b\s*\(',   # Python introspection
        r'\bglobals\b\s*\(',  # Python introspection
        r'\.\./',             # Path traversal
        r'\.\.\\',            # Path traversal (Windows)
        # Financial data patterns that shouldn't be in prompts
        r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit card
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
        r'\b\d{9}\b',              # SSN without dashes
        r'\$\d+\.\d{2}',           # Currency amounts (should use structured format)
    ]
    
    # Allowed HTML tags for rich text (very restrictive)
    ALLOWED_HTML_TAGS = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
    ALLOWED_HTML_ATTRIBUTES = {}
    
    def __init__(self):
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE | re.DOTALL) 
                                 for pattern in self.DANGEROUS_PATTERNS]
    
    async def validate_request(self, request: Request) -> ValidationResult:
        """Validate entire request for security threats"""
        try:
            # Check request size
            content_length = request.headers.get('content-length')
            if content_length and int(content_length) > self.MAX_REQUEST_SIZE:
                return ValidationResult(
                    is_valid=False,
                    violations=['Request size exceeds maximum allowed'],
                    risk_score=1.0
                )
            
            # Get request body
            body = await request.body()
            if len(body) > self.MAX_REQUEST_SIZE:
                return ValidationResult(
                    is_valid=False,
                    violations=['Request body size exceeds maximum allowed'],
                    risk_score=1.0
                )
            
            # Parse JSON safely
            try:
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                return ValidationResult(
                    is_valid=False,
                    violations=['Invalid JSON format'],
                    risk_score=0.8
                )
            
            # Validate data structure
            return await self.validate_data(data)
            
        except Exception as e:
            logger.error("Input validation error", error=str(e))
            return ValidationResult(
                is_valid=False,
                violations=['Validation system error'],
                risk_score=1.0
            )
    
    async def validate_data(self, data: Any, path: str = '', depth: int = 0) -> ValidationResult:
        """Recursively validate data structure"""
        violations = []
        risk_score = 0.0
        sanitized_data = None
        
        try:
            # Check nesting depth
            if depth > self.MAX_NESTED_DEPTH:
                return ValidationResult(
                    is_valid=False,
                    violations=[f'Maximum nesting depth exceeded at {path}'],
                    risk_score=0.9
                )
            
            if isinstance(data, dict):
                sanitized_data = {}
                for key, value in data.items():
                    # Validate key
                    key_result = await self._validate_string(str(key), f'{path}.{key}')
                    if not key_result.is_valid:
                        violations.extend(key_result.violations)
                        risk_score = max(risk_score, key_result.risk_score)
                        continue
                    
                    # Validate value recursively
                    value_result = await self.validate_data(value, f'{path}.{key}', depth + 1)
                    if not value_result.is_valid:
                        violations.extend(value_result.violations)
                        risk_score = max(risk_score, value_result.risk_score)
                        continue
                    
                    sanitized_data[key] = value_result.sanitized_data
            
            elif isinstance(data, list):
                if len(data) > self.MAX_ARRAY_SIZE:
                    return ValidationResult(
                        is_valid=False,
                        violations=[f'Array size exceeds maximum at {path}'],
                        risk_score=0.8
                    )
                
                sanitized_data = []
                for i, item in enumerate(data):
                    item_result = await self.validate_data(item, f'{path}[{i}]', depth + 1)
                    if not item_result.is_valid:
                        violations.extend(item_result.violations)
                        risk_score = max(risk_score, item_result.risk_score)
                        continue
                    
                    sanitized_data.append(item_result.sanitized_data)
            
            elif isinstance(data, str):
                string_result = await self._validate_string(data, path)
                if not string_result.is_valid:
                    violations.extend(string_result.violations)
                    risk_score = max(risk_score, string_result.risk_score)
                else:
                    sanitized_data = string_result.sanitized_data
            
            elif isinstance(data, (int, float, bool, type(None))):
                # Primitive types are safe after JSON parsing
                sanitized_data = data
            
            else:
                violations.append(f'Unsupported data type at {path}: {type(data)}')
                risk_score = max(risk_score, 0.7)
            
            return ValidationResult(
                is_valid=len(violations) == 0,
                sanitized_data=sanitized_data,
                violations=violations,
                risk_score=risk_score
            )
            
        except Exception as e:
            logger.error("Data validation error", path=path, error=str(e))
            return ValidationResult(
                is_valid=False,
                violations=[f'Validation error at {path}'],
                risk_score=1.0
            )
    
    async def _validate_string(self, text: str, path: str = '') -> ValidationResult:
        """Validate and sanitize string content"""
        violations = []
        risk_score = 0.0
        
        # Check length
        if len(text) > self.MAX_TEXT_LENGTH:
            return ValidationResult(
                is_valid=False,
                violations=[f'Text length exceeds maximum at {path}'],
                risk_score=0.8
            )
        
        # Check for dangerous patterns
        for pattern in self.compiled_patterns:
            matches = pattern.findall(text)
            if matches:
                violations.append(f'Dangerous pattern detected at {path}: {pattern.pattern}')
                risk_score = max(risk_score, 0.9)
        
        # Sanitize HTML content
        sanitized_text = bleach.clean(
            text,
            tags=self.ALLOWED_HTML_TAGS,
            attributes=self.ALLOWED_HTML_ATTRIBUTES,
            strip=True
        )
        
        # Check for encoding attacks
        if self._detect_encoding_attacks(text):
            violations.append(f'Encoding attack detected at {path}')
            risk_score = max(risk_score, 0.8)
        
        # Check for PII patterns
        pii_risk = self._detect_pii(text)
        if pii_risk > 0:
            violations.append(f'PII detected at {path}')
            risk_score = max(risk_score, pii_risk)
        
        return ValidationResult(
            is_valid=len(violations) == 0,
            sanitized_data=sanitized_text,
            violations=violations,
            risk_score=risk_score
        )
    
    def _detect_encoding_attacks(self, text: str) -> bool:
        """Detect various encoding-based attacks"""
        # Check for URL encoding
        if '%' in text and re.search(r'%[0-9a-fA-F]{2}', text):
            decoded = text
            try:
                import urllib.parse
                decoded = urllib.parse.unquote(text)
                # Check if decoded version contains dangerous patterns
                for pattern in self.compiled_patterns:
                    if pattern.search(decoded):
                        return True
            except:
                pass
        
        # Check for base64 encoding
        if re.search(r'[A-Za-z0-9+/=]{20,}', text):
            try:
                import base64
                decoded = base64.b64decode(text).decode('utf-8', errors='ignore')
                for pattern in self.compiled_patterns:
                    if pattern.search(decoded):
                        return True
            except:
                pass
        
        return False
    
    def _detect_pii(self, text: str) -> float:
        """Detect personally identifiable information"""
        risk_score = 0.0
        
        # Credit card numbers
        if re.search(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', text):
            risk_score = max(risk_score, 0.9)
        
        # Social Security Numbers
        if re.search(r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b', text):
            risk_score = max(risk_score, 0.9)
        
        # Email addresses (lower risk but still PII)
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text):
            risk_score = max(risk_score, 0.6)
        
        # Phone numbers
        if re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text):
            risk_score = max(risk_score, 0.7)
        
        return risk_score
    
    def validate_financial_amount(self, amount: str) -> bool:
        """Validate financial amount format"""
        try:
            # Use Decimal for precision financial calculations
            decimal_amount = Decimal(amount)
            # Check reasonable bounds
            if decimal_amount < Decimal('-999999999.9999') or decimal_amount > Decimal('999999999.9999'):
                return False
            return True
        except (InvalidOperation, ValueError):
            return False

class SecureInsightRequest(BaseModel):
    """Secure validation model for insight requests"""
    user_id: str
    insight_type: str
    context: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None
    
    @validator('user_id')
    def validate_user_id(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]{1,36}$', v):
            raise ValueError('Invalid user ID format')
        return v
    
    @validator('insight_type')
    def validate_insight_type(cls, v):
        allowed_types = [
            'budget_analysis', 'debt_optimization', 'investment_recommendation',
            'spending_pattern', 'savings_goal', 'risk_assessment'
        ]
        if v not in allowed_types:
            raise ValueError(f'Invalid insight type. Allowed: {allowed_types}')
        return v
    
    @validator('context')
    def validate_context(cls, v):
        if v is None:
            return v
        
        # Limit context size
        context_str = json.dumps(v)
        if len(context_str) > 10000:
            raise ValueError('Context data too large')
        
        return v

# Rate limiting decorator
class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}
    
    def is_allowed(self, identifier: str) -> bool:
        import time
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old entries
        if identifier in self.requests:
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier] 
                if req_time > window_start
            ]
        else:
            self.requests[identifier] = []
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True

# Anomaly detection for AI requests
class AIAnomalyDetector:
    """Detect anomalous patterns in AI requests that could indicate attacks"""
    
    def __init__(self):
        self.request_patterns = {}
        self.baseline_established = False
    
    def analyze_request(self, user_id: str, request_data: Dict[str, Any]) -> float:
        """Return anomaly score (0.0 = normal, 1.0 = highly anomalous)"""
        anomaly_score = 0.0
        
        # Check request frequency
        current_time = time.time()
        if user_id not in self.request_patterns:
            self.request_patterns[user_id] = {'requests': [], 'types': {}}
        
        user_patterns = self.request_patterns[user_id]
        
        # Clean old requests (last hour)
        user_patterns['requests'] = [
            req_time for req_time in user_patterns['requests']
            if current_time - req_time < 3600
        ]
        
        # Check request frequency anomaly
        recent_requests = len([
            req_time for req_time in user_patterns['requests']
            if current_time - req_time < 300  # Last 5 minutes
        ])
        
        if recent_requests > 50:  # More than 50 requests in 5 minutes
            anomaly_score = max(anomaly_score, 0.8)
        elif recent_requests > 20:
            anomaly_score = max(anomaly_score, 0.6)
        
        # Check for unusual request patterns
        insight_type = request_data.get('insight_type', '')
        if insight_type not in user_patterns['types']:
            user_patterns['types'][insight_type] = 0
        user_patterns['types'][insight_type] += 1
        
        # Record current request
        user_patterns['requests'].append(current_time)
        
        return anomaly_score

# Global instances
input_validator = AIInputValidator()
rate_limiter = RateLimiter(max_requests=100, window_seconds=3600)
anomaly_detector = AIAnomalyDetector()