#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI Module Migration Script
Moves GUI modules to proper package structure and updates imports
"""

import os
import shutil
import re
from pathlib import Path
from typing import List, Dict, Tuple


class ModuleMigrator:
    """Handles migration of modules to proper package structure"""
    
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir).resolve()
        self.src_dir = self.root_dir / "src" / "bear_ai"
        self.changes_made = []
        
    def log_change(self, action: str, details: str):
        """Log a migration change"""
        self.changes_made.append(f"{action}: {details}")
        print(f"✅ {action}: {details}")
        
    def migrate_gui_modules(self):
        """Migrate GUI modules from root to proper package structure"""
        
        print("🚀 Starting GUI module migration...")
        
        # Ensure GUI directory exists
        gui_dir = self.src_dir / "gui"
        gui_dir.mkdir(exist_ok=True)
        
        # Create __init__.py if it doesn't exist
        gui_init = gui_dir / "__init__.py"
        if not gui_init.exists():
            gui_init.write_text('''"""
BEAR AI GUI Modules
Graphical user interfaces for BEAR AI
"""

from .simple import SimpleBearAIGUI

__all__ = ["SimpleBearAIGUI"]
''')
            self.log_change("Created", str(gui_init))
        
        # Migration mappings
        migrations = [
            {
                "source": self.root_dir / "modern_gui.py",
                "target": gui_dir / "modern.py",
                "class_name": "ModernBearAIGUI"
            },
            {
                "source": self.src_dir / "professional_gui.py", 
                "target": gui_dir / "professional.py",
                "class_name": "ProfessionalBearAIGUI"
            }
        ]
        
        for migration in migrations:
            if migration["source"].exists():
                self.migrate_single_file(migration)
            else:
                print(f"⚠️  Source file not found: {migration['source']}")
                
    def migrate_single_file(self, migration: Dict):
        """Migrate a single file with import updates"""
        
        source = migration["source"]
        target = migration["target"]
        
        print(f"📦 Migrating {source.name} → {target}")
        
        # Read source file
        content = source.read_text(encoding='utf-8')
        
        # Update imports
        updated_content = self.update_imports(content, source.name)
        
        # Write to target
        target.write_text(updated_content, encoding='utf-8')
        
        self.log_change("Migrated", f"{source} → {target}")
        
        # Update GUI __init__.py
        self.update_gui_init(migration["class_name"], target.stem)
        
    def update_imports(self, content: str, filename: str) -> str:
        """Update imports in migrated file"""
        
        print(f"🔧 Updating imports in {filename}...")
        
        # Remove sys.path.insert hacks
        content = re.sub(
            r'sys\.path\.insert\(0,.*?\n',
            '# Import path hack removed during migration\n',
            content,
            flags=re.MULTILINE
        )
        
        # Update bear_ai imports to use absolute imports
        import_replacements = [
            (r'from bear_ai\.model_manager import', r'from bear_ai.models.manager import'),
            (r'from bear_ai\.chat import', r'from bear_ai.core.chat import'),
            (r'from bear_ai\.scrub import', r'from bear_ai.privacy.scrub import'),
            (r'from bear_ai\.pii import', r'from bear_ai.privacy.pii import'),
            (r'from bear_ai\.hw import', r'from bear_ai.core.hw import'),
            (r'from bear_ai\.download import', r'from bear_ai.core.download import'),
        ]
        
        for old_import, new_import in import_replacements:
            content = re.sub(old_import, new_import, content)
            
        # Add proper package imports at the top
        import_section = '''
# Import from bear_ai package - updated during migration
try:
    from bear_ai.core.chat import start_chat_interface
    from bear_ai.privacy.scrub import PIIScrubber
    from bear_ai.models.manager import get_model_manager
    BEAR_AI_IMPORTS = True
except ImportError:
    BEAR_AI_IMPORTS = False
    print("⚠️  Some BEAR AI modules not available - running in limited mode")

'''
        
        # Insert after existing imports
        import_pos = content.find('import tkinter')
        if import_pos != -1:
            # Find end of import section
            lines = content.split('\n')
            insert_line = 0
            for i, line in enumerate(lines):
                if line.strip().startswith(('import ', 'from ')) or line.strip() == '':
                    insert_line = i + 1
                else:
                    break
                    
            lines.insert(insert_line, import_section)
            content = '\n'.join(lines)
            
        return content
        
    def update_gui_init(self, class_name: str, module_name: str):
        """Update GUI __init__.py to include new module"""
        
        gui_init = self.src_dir / "gui" / "__init__.py"
        content = gui_init.read_text()
        
        # Add import if not already present
        import_line = f"from .{module_name} import {class_name}"
        if import_line not in content:
            # Add to imports section
            lines = content.split('\n')
            
            # Find __all__ line
            all_line_idx = -1
            for i, line in enumerate(lines):
                if '__all__' in line:
                    all_line_idx = i
                    break
                    
            if all_line_idx > 0:
                # Insert import before __all__
                lines.insert(all_line_idx, import_line)
                
                # Update __all__ list
                all_line = lines[all_line_idx + 1]
                if class_name not in all_line:
                    # Add to __all__ list
                    all_line = all_line.replace(']', f', "{class_name}"]')
                    lines[all_line_idx + 1] = all_line
                    
            gui_init.write_text('\n'.join(lines))
            self.log_change("Updated", f"GUI __init__.py with {class_name}")
            
    def create_main_modules(self):
        """Create missing __main__.py modules for python -m execution"""
        
        print("🔧 Creating __main__.py modules...")
        
        # Core module __main__.py
        core_main = self.src_dir / "core" / "__main__.py"
        if not core_main.parent.exists():
            core_main.parent.mkdir(exist_ok=True)
            
        if not core_main.exists():
            core_main.write_text('''#!/usr/bin/env python3
"""
BEAR AI Core Tools - Module Execution Entry Point
"""

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        prog="bear-ai-core",
        description="BEAR AI Core Tools - AI inference and model management"
    )
    
    subparsers = parser.add_subparsers(dest='tool', help='Available tools')
    
    # Chat tool
    chat_parser = subparsers.add_parser('chat', help='Interactive chat interface')
    chat_parser.add_argument('--model', help='Model to use')
    
    # Download tool
    download_parser = subparsers.add_parser('download', help='Download models')
    download_parser.add_argument('model_id', help='HuggingFace model ID')
    
    args = parser.parse_args()
    
    if args.tool == 'chat':
        from .chat import main as chat_main
        chat_main(args.model)
    elif args.tool == 'download':
        from .download import main as download_main
        download_main([args.model_id])
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
''')
            self.log_change("Created", str(core_main))
            
        # Models module __main__.py
        models_main = self.src_dir / "models" / "__main__.py"
        if not models_main.parent.exists():
            models_main.parent.mkdir(exist_ok=True)
            
        if not models_main.exists():
            models_main.write_text('''#!/usr/bin/env python3
"""
BEAR AI Model Management - Module Execution Entry Point
"""

import argparse


def main():
    parser = argparse.ArgumentParser(
        prog="bear-ai-models",
        description="BEAR AI Model Management Tools"
    )
    
    parser.add_argument('action', choices=['list', 'install', 'remove', 'info'])
    parser.add_argument('model', nargs='?', help='Model identifier')
    parser.add_argument('--gui', action='store_true', help='Launch GUI')
    
    args = parser.parse_args()
    
    if args.gui:
        print("🚀 Launching Model Manager GUI...")
        # GUI implementation would go here
    else:
        from .manager import handle_cli_command
        handle_cli_command(args)


if __name__ == "__main__":
    main()
''')
            self.log_change("Created", str(models_main))
            
    def create_import_compatibility(self):
        """Create backward compatibility imports"""
        
        print("🔄 Creating backward compatibility imports...")
        
        # Update main __init__.py for backward compatibility
        main_init = self.src_dir / "__init__.py"
        content = main_init.read_text()
        
        compat_section = '''
# Backward compatibility imports - deprecated
def _deprecated_import_warning(old_path, new_path):
    import warnings
    warnings.warn(
        f"Importing from '{old_path}' is deprecated. "
        f"Use '{new_path}' instead.",
        DeprecationWarning,
        stacklevel=3
    )

# Provide compatibility for old GUI imports
try:
    from .gui.simple import SimpleBearAIGUI
    from .gui.modern import ModernBearAIGUI
    from .gui.professional import ProfessionalBearAIGUI
except ImportError:
    # Fallback for missing GUI modules
    SimpleBearAIGUI = None
    ModernBearAIGUI = None  
    ProfessionalBearAIGUI = None

'''
        
        if "# Backward compatibility" not in content:
            # Add compatibility section before final __all__
            lines = content.split('\n')
            all_idx = -1
            for i, line in enumerate(lines):
                if line.startswith('__all__'):
                    all_idx = i
                    break
                    
            if all_idx > 0:
                lines.insert(all_idx, compat_section)
                main_init.write_text('\n'.join(lines))
                self.log_change("Updated", "Main __init__.py with compatibility imports")
                
    def run_migration(self):
        """Run complete module migration"""
        
        print("🚀 Starting BEAR AI Module Migration")
        print("=" * 50)
        
        try:
            # Step 1: Migrate GUI modules
            self.migrate_gui_modules()
            
            # Step 2: Create missing __main__.py modules
            self.create_main_modules()
            
            # Step 3: Add backward compatibility
            self.create_import_compatibility()
            
            print("\n" + "=" * 50)
            print("✅ Migration completed successfully!")
            print(f"📝 Made {len(self.changes_made)} changes:")
            
            for change in self.changes_made:
                print(f"  • {change}")
                
            print("\n🧪 Next steps:")
            print("  1. Test the migrated modules")
            print("  2. Update pyproject.toml configuration")  
            print("  3. Test console script entry points")
            print("  4. Update documentation")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False
            
        return True


def main():
    """Main entry point"""
    
    print("BEAR AI Module Migration Script")
    
    migrator = ModuleMigrator()
    
    if migrator.run_migration():
        print("\n🎉 Migration successful!")
        return 0
    else:
        print("\n💥 Migration failed!")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())