# ADR-001: Tauri Version Alignment Strategy

## Status
Accepted

## Context

BEAR AI Legal Assistant is a desktop-only application built with Tauri 1.6.x stack. A version mismatch between the globally installed Tauri CLI 2.8.4 and project dependencies (Tauri 1.6.x) is causing schema validation failures and build errors.

### Current Technical Stack
- **Tauri Core**: 1.6.8 (Rust crates)
- **Tauri API**: 1.6.0 (TypeScript/React)
- **Global CLI**: 2.8.4 (schema incompatible)
- **Target Platforms**: Windows, macOS, Linux desktop

### Problem Statement
- Schema validation errors: `"identifier" is a required property`
- Build path errors: `Additional properties not allowed ('distDir', 'devPath')`
- Configuration structure mismatch between v1 and v2 schemas

## Decision

**Selected: Option A - Stay on Tauri 1 with Proper CLI Version Pinning**

### Alternatives Considered

#### Option A: Tauri 1.x with CLI Alignment ✅ SELECTED
- **Pros**:
  - Zero migration overhead
  - Proven stability for desktop applications
  - Immediate fix with minimal risk
  - Maintains existing build pipeline
  - Full platform compatibility validated
- **Cons**:
  - Missing latest Tauri 2.x features
  - Eventually will need migration

#### Option B: Full Tauri 2.x Migration ❌ REJECTED
- **Pros**:
  - Access to latest features
  - Future-proof architecture
  - Better mobile support (not needed)
- **Cons**:
  - Significant migration effort (3-5 days)
  - Breaking changes in API surface
  - Risk of introducing new bugs
  - Mobile features not required for desktop-only app

#### Option C: Hybrid Approach ❌ REJECTED
- **Pros**:
  - Gradual migration path
- **Cons**:
  - Complex dual-version management
  - Potential for more compatibility issues
  - Higher maintenance overhead

## Implementation Strategy

### Phase 1: Immediate Fix (2-4 hours)
1. Install project-local Tauri CLI 1.6.0
2. Update npm scripts to use `npx tauri`
3. Verify schema compatibility
4. Test builds on all target platforms

### Phase 2: Build System Hardening (1-2 hours)
1. Pin exact versions in package.json
2. Add build verification scripts
3. Update CI/CD pipeline for version consistency
4. Document build requirements

### Phase 3: Future Migration Planning (Documentation only)
1. Create Tauri 2.x migration roadmap
2. Identify breaking changes and required updates
3. Establish migration trigger criteria

## Technical Requirements

### Version Pinning Strategy
```json
{
  "devDependencies": {
    "@tauri-apps/cli": "1.6.0",
    "@tauri-apps/api": "1.6.0"
  }
}
```

### NPM Script Updates
```json
{
  "scripts": {
    "tauri": "npx tauri",
    "tauri:dev": "npx tauri dev",
    "tauri:build": "npx tauri build"
  }
}
```

## Quality Attributes Addressed

- **Reliability**: Eliminates schema validation failures
- **Maintainability**: Consistent version management
- **Buildability**: Reliable cross-platform builds
- **Portability**: Maintains Windows/Mac/Linux support

## Risks and Mitigation

### Risk: Global CLI Interference
- **Mitigation**: Use `npx` to prioritize project-local CLI
- **Fallback**: Add `.nvmrc` equivalent for Tauri versions

### Risk: Team Environment Inconsistency
- **Mitigation**: Document exact version requirements
- **Verification**: Add version check in build scripts

### Risk: Future Security Updates
- **Mitigation**: Regular dependency audits
- **Monitoring**: Subscribe to Tauri security advisories

## Success Criteria

1. ✅ Builds complete without schema errors
2. ✅ All npm scripts execute correctly
3. ✅ Cross-platform builds successful
4. ✅ CI/CD pipeline stability
5. ✅ Team development environment consistency

## Migration Path to Tauri 2.x (Future)

### Trigger Conditions
- Critical security vulnerabilities in Tauri 1.x
- Required features only available in Tauri 2.x
- End of life announcement for Tauri 1.x
- Major UI framework migration

### Estimated Migration Effort
- **Analysis**: 1 day
- **Core migration**: 2-3 days
- **Testing**: 1-2 days
- **Total**: 4-6 days

### Breaking Changes to Address
- Configuration schema restructuring
- API method signature changes
- Plugin system updates
- Build toolchain modifications

## Conclusion

Staying on Tauri 1.x with proper CLI version alignment provides the optimal balance of stability, minimal risk, and immediate problem resolution for BEAR AI's desktop-focused use case. This decision ensures reliable builds while preserving the option for future migration when business needs justify the effort.

## References
- [Tauri 1.x Documentation](https://tauri.app/v1/)
- [Tauri 2.x Migration Guide](https://tauri.app/v2/migrate/)
- BEAR AI Build Pipeline Documentation