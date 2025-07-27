# Memory Update Protocol - Atlas Financial v1.1

## MANDATORY RULE: Every Step Updates Memory System

### Protocol Requirements
For **EVERY** action, decision, file creation, command execution, or configuration change, I MUST:

1. **Update Static Memory** (within 30 seconds of action)
2. **Update Contextual Memory** (within 60 seconds of action) 
3. **Update Knowledge Graph** (within 90 seconds of action)

### Update Triggers
- ✅ File created/modified
- ✅ Command executed
- ✅ Configuration changed
- ✅ Service deployed
- ✅ Integration tested
- ✅ Documentation written
- ✅ Decision made
- ✅ Problem encountered
- ✅ Solution implemented

### Memory Update Sequence
```
ACTION TAKEN → Static Memory Update → Contextual Memory Update → Knowledge Graph Update
```

### Mandatory Updates Per Step

#### 1. Static Memory Update
**File Pattern**: `docs/memory/static/YYYY-MM-DD_phase-X_specific-action.md`
**Must Include**:
- Timestamp
- Exact commands run
- Files created/modified
- Status (completed/in-progress/blocked)
- Next immediate action

#### 2. Contextual Memory Update
**File Pattern**: `docs/memory/contextual/component-name_context_relationships.md`
**Must Include**:
- How this step affects system relationships
- Dependency changes
- Integration implications
- Future maintenance considerations

#### 3. Knowledge Graph Update
**File Pattern**: `docs/memory/knowledge-graph/system-architecture_vX.md`
**Must Include**:
- New nodes added to system
- New edges/relationships
- Architecture evolution
- Updated diagrams

### Continuous Flow Rules

#### Before Each New Step:
1. Review latest memory files
2. Identify what will change
3. Plan memory updates

#### During Each Step:
1. Document decisions in static memory immediately
2. Note relationships in contextual memory
3. Prepare knowledge graph updates

#### After Each Step:
1. Complete all three memory file updates
2. Cross-reference between files
3. Verify consistency across memory system

### Memory File Cross-Referencing
Every memory file MUST reference related files:
```markdown
## Cross-References
- **Previous Static**: `docs/memory/static/[previous-file].md`
- **Related Contextual**: `docs/memory/contextual/[related-file].md`
- **Current Knowledge Graph**: `docs/memory/knowledge-graph/system-architecture_v[X].md`
- **Source**: [URL or file reference]
```

### Quality Gates
❌ **NEVER proceed to next step without updating all three memory files**
❌ **NEVER leave placeholder content in memory files**
❌ **NEVER break cross-reference links**
✅ **ALWAYS maintain complete traceability**
✅ **ALWAYS explain reasoning in contextual memory**
✅ **ALWAYS update system diagrams**

### Memory File Naming Standards
- **Static**: Date-based sequence for chronological tracking
- **Contextual**: Component-based for relationship mapping  
- **Knowledge Graph**: Version-based for architecture evolution

### Validation Checklist (Every Step)
- [ ] Static memory file created/updated
- [ ] Contextual memory file created/updated
- [ ] Knowledge graph file created/updated
- [ ] Cross-references are valid
- [ ] All URLs and citations included
- [ ] Future implications documented

## Implementation
This protocol is now ACTIVE and will be followed for every subsequent action in the Atlas Financial v1.1 development process.

**Next Action**: Proceed with Docker Compose setup while maintaining full memory system updates.