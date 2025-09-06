# BEAR AI Package Migration Plan

## Overview

This document outlines the step-by-step migration from the current mixed packaging approach to a modern, standardized Python package structure for BEAR AI.

## Migration Phases

### Phase 1: Prepare New Structure (Non-Breaking) ✅

**Status: COMPLETED**

#### What's Been Done:
1. ✅ Created modern `pyproject_new.toml` with complete packaging configuration
2. ✅ Designed proper module organization in `src/bear_ai/` structure  
3. ✅ Created `bear_ai.gui.__main__.py` for GUI launcher
4. ✅ Created `bear_ai.privacy.__main__.py` for privacy tools
5. ✅ Moved `simple_gui.py` to `bear_ai.gui.simple.py` with proper imports
6. ✅ Documented packaging strategy and architecture decisions

#### Console Script Entry Points:
```toml
[project.scripts]
bear-ai = "bear_ai.__main__:main"                    # Main CLI interface
bear-ai-gui = "bear_ai.gui.__main__:main"           # GUI launcher with selector
bear-ai-chat = "bear_ai.core.chat:main"             # Interactive chat interface
bear-ai-scrub = "bear_ai.privacy.scrub:main"        # PII scrubbing tool
bear-ai-serve = "bear_ai.server.openai_server:main" # OpenAI-compatible API server
bear-ai-setup = "bear_ai.setup:main"                # Initial setup wizard
bear-ai-models = "bear_ai.models.manager:main"      # Model management CLI
bear-ai-benchmark = "bear_ai.benchmarking:main"     # Performance benchmarking
```

### Phase 2: Complete Module Migration (In Progress) 🚧

**Status: IN PROGRESS**

#### Remaining Tasks:

1. **Move Remaining GUI Files:**
   - Move `modern_gui.py` → `src/bear_ai/gui/modern.py`
   - Move GUI components from `src/bear_ai/professional_gui.py` → `src/bear_ai/gui/professional.py` 
   - Update all GUI imports to use absolute package paths
   - Create `src/bear_ai/gui/base.py` for shared GUI utilities

2. **Create Missing __main__.py Files:**
   - `src/bear_ai/core/__main__.py` for core tools
   - `src/bear_ai/models/__main__.py` for model management
   - `src/bear_ai/server/__main__.py` for server tools

3. **Update Import Statements:**
   - Replace all `sys.path.insert()` hacks with proper imports
   - Update relative imports to absolute imports
   - Add proper error handling for missing dependencies

4. **Test New Structure:**
   - Test all console scripts work after `pip install -e .`
   - Test `python -m bear_ai.gui` execution
   - Test backward compatibility imports

### Phase 3: Update Entry Points (Breaking Changes) 🔄

**Status: PENDING**

#### Tasks:
1. **Replace Current pyproject.toml:**
   ```bash
   mv pyproject.toml pyproject_old.toml
   mv pyproject_new.toml pyproject.toml
   ```

2. **Remove Legacy setup.py:**
   - Archive `setup.py` as `setup_legacy.py`
   - Update build and CI scripts to use pyproject.toml

3. **Update Installation:**
   - Test `pip install -e .` with new configuration
   - Test all entry points work correctly
   - Update development installation docs

4. **Clean Up Root Files:**
   - Remove `simple_gui.py` (now in package)
   - Remove `modern_gui.py` (now in package)  
   - Remove `gui_launcher.py` (now console script)
   - Update batch files to use console scripts

### Phase 4: Update Documentation and CI (Final) 📚

**Status: PENDING**

#### Tasks:
1. **Update Installation Instructions:**
   - README.md installation section
   - INSTALLATION_GUIDE.md complete rewrite
   - Update quick start examples

2. **Update Batch Files:**
   - Replace Python script calls with console scripts
   - Update `launch_simple.bat`, `launch_modern.bat`, etc.
   - Test on Windows, Linux, Mac

3. **Update CI/CD:**
   - Update GitHub Actions workflows
   - Update packaging and distribution scripts
   - Test automated builds

4. **Clean Up:**
   - Remove deprecated files
   - Archive old configuration
   - Update .gitignore if needed

## Migration Execution Scripts

### Script 1: Module Migration
```bash
#!/bin/bash
# migrate_modules.sh

echo "🚀 Migrating BEAR AI modules to proper structure..."

# Create directories
mkdir -p src/bear_ai/gui
mkdir -p src/bear_ai/core  
mkdir -p src/bear_ai/models

# Move GUI files
mv modern_gui.py src/bear_ai/gui/modern.py
mv src/bear_ai/professional_gui.py src/bear_ai/gui/professional.py

# Update imports in moved files
python scripts/update_imports.py

echo "✅ Module migration completed"
```

### Script 2: Entry Point Migration  
```bash
#!/bin/bash
# migrate_entry_points.sh

echo "🔄 Migrating to new entry points..."

# Backup old configuration
cp pyproject.toml pyproject_old.toml
cp setup.py setup_legacy.py

# Apply new configuration  
cp pyproject_new.toml pyproject.toml

# Test installation
pip install -e .

# Test entry points
bear-ai --version
bear-ai-gui --list
bear-ai-scrub --help

echo "✅ Entry point migration completed"
```

### Script 3: Cleanup
```bash
#!/bin/bash
# cleanup_migration.sh

echo "🧹 Cleaning up migration artifacts..."

# Remove deprecated root files
rm -f simple_gui.py
rm -f modern_gui.py
rm -f gui_launcher.py

# Archive old configs
mkdir -p archive/old_packaging
mv pyproject_old.toml archive/old_packaging/
mv setup_legacy.py archive/old_packaging/

echo "✅ Migration cleanup completed"
```

## Testing Strategy

### Pre-Migration Tests
```bash
# Test current functionality
python simple_gui.py
python modern_gui.py
python gui_launcher.py
python -m bear_ai --help
```

### Post-Migration Tests  
```bash
# Test new entry points
bear-ai-gui selector
bear-ai-gui simple
bear-ai-gui modern
bear-ai-chat --help
bear-ai-scrub --help

# Test module execution
python -m bear_ai.gui
python -m bear_ai.privacy
python -m bear_ai --help

# Test installation
pip uninstall bear-ai -y
pip install -e .
bear-ai --version
```

## Rollback Strategy

If migration fails, rollback procedure:

```bash
#!/bin/bash
# rollback_migration.sh

echo "🔙 Rolling back migration..."

# Restore old files
mv archive/old_packaging/pyproject_old.toml pyproject.toml
mv archive/old_packaging/setup_legacy.py setup.py

# Restore root GUI files from git
git checkout HEAD -- simple_gui.py modern_gui.py gui_launcher.py

# Reinstall old version
pip install -e .

echo "✅ Rollback completed"
```

## Timeline and Dependencies

### Week 1: Complete Phase 2
- [ ] Move all GUI modules to proper locations
- [ ] Create remaining __main__.py files  
- [ ] Update all import statements
- [ ] Test new structure alongside old

### Week 2: Execute Phase 3
- [ ] Apply new pyproject.toml
- [ ] Remove legacy files
- [ ] Test console scripts extensively
- [ ] Update batch files

### Week 3: Finalize Phase 4  
- [ ] Update all documentation
- [ ] Test installation on multiple platforms
- [ ] Update CI/CD pipelines
- [ ] Clean up deprecated code

## Success Criteria

Migration is considered successful when:

1. ✅ All console scripts work: `bear-ai`, `bear-ai-gui`, `bear-ai-chat`, `bear-ai-scrub`
2. ✅ Python module execution works: `python -m bear_ai.gui`, `python -m bear_ai.privacy`
3. ✅ Installation works: `pip install -e .` installs cleanly
4. ✅ Cross-platform compatibility: Windows/Linux/Mac all work
5. ✅ No import errors or sys.path hacks
6. ✅ All existing functionality preserved
7. ✅ Documentation updated and accurate

## Risk Mitigation

### Identified Risks:
1. **Import breakage** - Mitigated by maintaining backward compatibility imports
2. **Entry point failures** - Mitigated by extensive testing before deployment  
3. **Platform compatibility** - Mitigated by testing on multiple platforms
4. **User workflow disruption** - Mitigated by gradual rollout and clear documentation

### Emergency Contacts:
- Lead Developer: Available for urgent migration issues
- CI/CD Team: For build and deployment problems  
- QA Team: For comprehensive testing support

## Communication Plan

### Pre-Migration:
- [ ] Notify all developers of upcoming changes
- [ ] Create migration documentation  
- [ ] Set up testing environment

### During Migration:
- [ ] Daily status updates
- [ ] Immediate notification of issues
- [ ] Testing results reporting

### Post-Migration:
- [ ] Success confirmation
- [ ] Updated documentation distribution
- [ ] User training if needed