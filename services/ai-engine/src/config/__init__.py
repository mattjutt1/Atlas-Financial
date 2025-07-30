"""
Configuration module for Atlas Financial AI Engine
Bridges with atlas-shared configuration patterns
"""

from .atlas_config_bridge import (
    AtlasConfigBridge,
    get_atlas_config,
    reset_atlas_config,
    ATLAS_SHARED_AVAILABLE
)

__all__ = [
    'AtlasConfigBridge',
    'get_atlas_config',
    'reset_atlas_config',
    'ATLAS_SHARED_AVAILABLE'
]
