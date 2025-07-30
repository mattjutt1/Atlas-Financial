"""
Data Privacy Protection and PII Anonymization
Prevents PII exposure in ML training data and model inference
"""

import re
import hashlib
import logging
import random
import string
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum
import structlog
from decimal import Decimal
import json

logger = structlog.get_logger()

class PIIType(Enum):
    SSN = "social_security_number"
    CREDIT_CARD = "credit_card_number"
    EMAIL = "email_address"
    PHONE = "phone_number"
    NAME = "personal_name"
    ADDRESS = "street_address"
    BANK_ACCOUNT = "bank_account_number"
    ROUTING_NUMBER = "routing_number"
    DATE_OF_BIRTH = "date_of_birth"
    DRIVER_LICENSE = "driver_license"

@dataclass
class PIIDetectionResult:
    found: bool
    pii_type: PIIType
    original_value: str
    start_pos: int
    end_pos: int
    confidence: float

@dataclass
class AnonymizationResult:
    anonymized_data: Any
    pii_detected: List[PIIDetectionResult]
    anonymization_applied: bool
    metadata: Dict[str, Any]

class DataAnonymizer:
    """Bank-grade data anonymization for AI training and inference"""
    
    def __init__(self):
        self.salt = self._generate_salt()
        self.anonymization_cache = {}
        
        # PII detection patterns
        self.pii_patterns = {
            PIIType.SSN: [
                r'\b\d{3}-\d{2}-\d{4}\b',
                r'\b\d{3}\s\d{2}\s\d{4}\b',
                r'\b\d{9}\b'
            ],
            PIIType.CREDIT_CARD: [
                r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
                r'\b\d{13,19}\b'
            ],
            PIIType.EMAIL: [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            ],
            PIIType.PHONE: [
                r'\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
                r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
            ],
            PIIType.BANK_ACCOUNT: [
                r'\b\d{8,17}\b'  # Bank account numbers
            ],
            PIIType.ROUTING_NUMBER: [
                r'\b\d{9}\b'  # US routing numbers
            ],
            PIIType.DATE_OF_BIRTH: [
                r'\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b',
                r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b'
            ]
        }
        
        # Compile patterns for performance
        self.compiled_patterns = {}
        for pii_type, patterns in self.pii_patterns.items():
            self.compiled_patterns[pii_type] = [
                re.compile(pattern, re.IGNORECASE) for pattern in patterns
            ]
    
    def anonymize_for_training(self, data: Any) -> AnonymizationResult:
        """
        Anonymize data for ML training - removes all PII completely
        """
        logger.info("Anonymizing data for ML training")
        
        try:
            pii_detected = []
            anonymized_data = self._deep_anonymize(data, pii_detected, mode='training')
            
            return AnonymizationResult(
                anonymized_data=anonymized_data,
                pii_detected=pii_detected,
                anonymization_applied=len(pii_detected) > 0,
                metadata={
                    'mode': 'training',
                    'pii_count': len(pii_detected),
                    'anonymization_method': 'complete_removal'
                }
            )
            
        except Exception as e:
            logger.error("Training data anonymization failed", error=str(e))
            raise
    
    def anonymize_for_inference(self, data: Any) -> AnonymizationResult:
        """
        Anonymize data for AI inference - uses reversible anonymization
        """
        logger.info("Anonymizing data for AI inference")
        
        try:
            pii_detected = []
            anonymized_data = self._deep_anonymize(data, pii_detected, mode='inference')
            
            return AnonymizationResult(
                anonymized_data=anonymized_data,
                pii_detected=pii_detected,
                anonymization_applied=len(pii_detected) > 0,
                metadata={
                    'mode': 'inference',
                    'pii_count': len(pii_detected),
                    'anonymization_method': 'reversible_tokenization'
                }
            )
            
        except Exception as e:
            logger.error("Inference data anonymization failed", error=str(e))
            raise
    
    def _deep_anonymize(self, data: Any, pii_detected: List[PIIDetectionResult], mode: str, path: str = '') -> Any:
        """
        Recursively anonymize data structure
        """
        if isinstance(data, dict):
            anonymized_dict = {}
            for key, value in data.items():
                # Check if key itself contains PII
                key_pii = self._detect_pii_in_text(str(key))
                if key_pii:
                    pii_detected.extend(key_pii)
                    anonymized_key = self._anonymize_key(key, mode)
                else:
                    anonymized_key = key
                
                anonymized_dict[anonymized_key] = self._deep_anonymize(
                    value, pii_detected, mode, f'{path}.{key}'
                )
            return anonymized_dict
            
        elif isinstance(data, list):
            return [
                self._deep_anonymize(item, pii_detected, mode, f'{path}[{i}]')
                for i, item in enumerate(data)
            ]
            
        elif isinstance(data, str):
            return self._anonymize_string(data, pii_detected, mode, path)
            
        elif isinstance(data, (int, float, Decimal)):
            # Check if number could be PII (SSN, phone, etc.)
            str_data = str(data)
            detected_pii = self._detect_pii_in_text(str_data)
            if detected_pii:
                pii_detected.extend(detected_pii)
                return self._anonymize_number(data, mode)
            return data
            
        else:
            return data
    
    def _anonymize_string(self, text: str, pii_detected: List[PIIDetectionResult], mode: str, path: str) -> str:
        """
        Anonymize PII in text strings
        """
        detected_pii = self._detect_pii_in_text(text)
        pii_detected.extend(detected_pii)
        
        if not detected_pii:
            return text
        
        logger.info(f"PII detected in string", path=path, count=len(detected_pii))
        
        # Sort by position (descending) to avoid position shifts during replacement
        detected_pii.sort(key=lambda x: x.start_pos, reverse=True)
        
        anonymized_text = text
        for pii in detected_pii:
            if mode == 'training':
                # Complete removal for training data
                replacement = self._get_training_replacement(pii.pii_type)
            else:
                # Reversible tokenization for inference
                replacement = self._get_inference_replacement(pii.original_value, pii.pii_type)
            
            anonymized_text = (
                anonymized_text[:pii.start_pos] + 
                replacement + 
                anonymized_text[pii.end_pos:]
            )
        
        return anonymized_text
    
    def _detect_pii_in_text(self, text: str) -> List[PIIDetectionResult]:
        """
        Detect all PII patterns in text
        """
        detected_pii = []
        
        for pii_type, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                matches = pattern.finditer(text)
                for match in matches:
                    # Additional validation for specific PII types
                    if self._validate_pii_match(match.group(), pii_type):
                        detected_pii.append(PIIDetectionResult(
                            found=True,
                            pii_type=pii_type,
                            original_value=match.group(),
                            start_pos=match.start(),
                            end_pos=match.end(),
                            confidence=self._calculate_confidence(match.group(), pii_type)
                        ))
        
        return detected_pii
    
    def _validate_pii_match(self, value: str, pii_type: PIIType) -> bool:
        """
        Additional validation for PII matches to reduce false positives
        """
        if pii_type == PIIType.CREDIT_CARD:
            return self._validate_credit_card(value)
        elif pii_type == PIIType.SSN:
            return self._validate_ssn(value)
        elif pii_type == PIIType.PHONE:
            return self._validate_phone(value)
        else:
            return True
    
    def _validate_credit_card(self, number: str) -> bool:
        """
        Validate credit card using Luhn algorithm
        """
        # Remove non-digits
        digits = re.sub(r'\D', '', number)
        
        if len(digits) < 13 or len(digits) > 19:
            return False
        
        # Luhn algorithm
        def luhn_check(card_num):
            def digits_of(n):
                return [int(d) for d in str(n)]
            
            digits = digits_of(card_num)
            odd_digits = digits[-1::-2]
            even_digits = digits[-2::-2]
            checksum = sum(odd_digits)
            for d in even_digits:
                checksum += sum(digits_of(d*2))
            return checksum % 10 == 0
        
        return luhn_check(digits)
    
    def _validate_ssn(self, ssn: str) -> bool:
        """
        Basic SSN validation
        """
        digits = re.sub(r'\D', '', ssn)
        
        if len(digits) != 9:
            return False
        
        # Check for invalid SSN patterns
        if digits == '000000000' or digits[:3] == '000' or digits[3:5] == '00' or digits[5:] == '0000':
            return False
        
        return True
    
    def _validate_phone(self, phone: str) -> bool:
        """
        Basic phone number validation
        """
        digits = re.sub(r'\D', '', phone)
        
        # US phone numbers should be 10 or 11 digits
        if len(digits) in [10, 11]:
            if len(digits) == 11 and digits[0] == '1':
                return True
            elif len(digits) == 10:
                return True
        
        return False
    
    def _calculate_confidence(self, value: str, pii_type: PIIType) -> float:
        """
        Calculate confidence score for PII detection
        """
        base_confidence = 0.8
        
        # Adjust confidence based on context and validation
        if pii_type == PIIType.CREDIT_CARD and self._validate_credit_card(value):
            return 0.95
        elif pii_type == PIIType.SSN and self._validate_ssn(value):
            return 0.95
        elif pii_type == PIIType.EMAIL and '@' in value and '.' in value:
            return 0.9
        
        return base_confidence
    
    def _get_training_replacement(self, pii_type: PIIType) -> str:
        """
        Get replacement text for training data (complete anonymization)
        """
        replacements = {
            PIIType.SSN: '[SSN_REMOVED]',
            PIIType.CREDIT_CARD: '[CARD_REMOVED]',
            PIIType.EMAIL: '[EMAIL_REMOVED]',
            PIIType.PHONE: '[PHONE_REMOVED]',
            PIIType.NAME: '[NAME_REMOVED]',
            PIIType.ADDRESS: '[ADDRESS_REMOVED]',
            PIIType.BANK_ACCOUNT: '[ACCOUNT_REMOVED]',
            PIIType.ROUTING_NUMBER: '[ROUTING_REMOVED]',
            PIIType.DATE_OF_BIRTH: '[DOB_REMOVED]',
            PIIType.DRIVER_LICENSE: '[LICENSE_REMOVED]'
        }
        
        return replacements.get(pii_type, '[PII_REMOVED]')
    
    def _get_inference_replacement(self, value: str, pii_type: PIIType) -> str:
        """
        Get tokenized replacement for inference (reversible)
        """
        # Create deterministic but secure token
        token_hash = hashlib.sha256(f"{value}{self.salt}".encode()).hexdigest()[:16]
        
        type_prefixes = {
            PIIType.SSN: 'SSN_',
            PIIType.CREDIT_CARD: 'CC_',
            PIIType.EMAIL: 'EMAIL_',
            PIIType.PHONE: 'PHONE_',
            PIIType.NAME: 'NAME_',
            PIIType.ADDRESS: 'ADDR_',
            PIIType.BANK_ACCOUNT: 'ACCT_',
            PIIType.ROUTING_NUMBER: 'RTG_',
            PIIType.DATE_OF_BIRTH: 'DOB_',
            PIIType.DRIVER_LICENSE: 'LIC_'
        }
        
        prefix = type_prefixes.get(pii_type, 'PII_')
        return f"[{prefix}{token_hash}]"
    
    def _anonymize_key(self, key: str, mode: str) -> str:
        """
        Anonymize dictionary keys that contain PII
        """
        if mode == 'training':
            return f"[ANON_KEY_{hashlib.md5(key.encode()).hexdigest()[:8]}]"
        else:
            return f"[KEY_{hashlib.sha256(f'{key}{self.salt}'.encode()).hexdigest()[:16]}]"
    
    def _anonymize_number(self, number: Union[int, float, Decimal], mode: str) -> Union[int, float, Decimal, str]:
        """
        Anonymize numeric values that could be PII
        """
        if mode == 'training':
            return "[NUMBER_REMOVED]"
        else:
            # Generate consistent fake number with same characteristics
            str_num = str(number)
            token = hashlib.sha256(f"{str_num}{self.salt}".encode()).hexdigest()[:len(str_num)]
            return f"[NUM_{token}]"
    
    def _generate_salt(self) -> str:
        """
        Generate cryptographic salt for anonymization
        """
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    
    def validate_anonymization(self, original_data: Any, anonymized_data: Any) -> Dict[str, Any]:
        """
        Validate that anonymization was successful
        """
        original_str = json.dumps(original_data, default=str, sort_keys=True)
        anonymized_str = json.dumps(anonymized_data, default=str, sort_keys=True)
        
        # Check that no PII remains in anonymized data
        remaining_pii = self._detect_pii_in_text(anonymized_str)
        
        validation_result = {
            'anonymization_successful': len(remaining_pii) == 0,
            'remaining_pii_count': len(remaining_pii),
            'remaining_pii_types': [pii.pii_type.value for pii in remaining_pii],
            'size_reduction': len(original_str) - len(anonymized_str),
            'data_integrity_preserved': self._check_data_integrity(original_data, anonymized_data)
        }
        
        if not validation_result['anonymization_successful']:
            logger.error("Anonymization validation failed", 
                        remaining_pii=remaining_pii,
                        validation_result=validation_result)
        
        return validation_result
    
    def _check_data_integrity(self, original: Any, anonymized: Any) -> bool:
        """
        Check that data structure integrity is preserved after anonymization
        """
        try:
            if type(original) != type(anonymized):
                return False
            
            if isinstance(original, dict):
                # Check that non-PII keys are preserved
                return len(original) == len(anonymized)
            
            elif isinstance(original, list):
                return len(original) == len(anonymized)
            
            return True
            
        except Exception:
            return False

# Global anonymizer instance
data_anonymizer = DataAnonymizer()

def anonymize_training_data(data: Any) -> AnonymizationResult:
    """
    Convenience function for training data anonymization
    """
    return data_anonymizer.anonymize_for_training(data)

def anonymize_inference_data(data: Any) -> AnonymizationResult:
    """
    Convenience function for inference data anonymization
    """
    return data_anonymizer.anonymize_for_inference(data)