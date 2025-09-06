#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI Privacy Tools - Module Execution Entry Point
CLI interface for privacy and PII protection tools
"""

import argparse
import sys
from typing import Optional, List


def main(argv: Optional[List[str]] = None):
    """Main entry point for privacy tools"""
    
    parser = argparse.ArgumentParser(
        prog="bear-ai-privacy",
        description="BEAR AI Privacy Tools - PII detection and data protection"
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available privacy tools')
    
    # Scrub command
    scrub_parser = subparsers.add_parser('scrub', help='PII scrubbing and anonymization')
    scrub_parser.add_argument('input', nargs='?', help='Input text or file to scrub')
    scrub_parser.add_argument('--output', '-o', help='Output file for scrubbed text')
    scrub_parser.add_argument('--gui', action='store_true', help='Launch GUI interface')
    scrub_parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    scrub_parser.add_argument('--policy', help='Privacy policy to apply')
    scrub_parser.add_argument('--format', choices=['text', 'json', 'xml'], default='text', help='Output format')
    
    # Audit command  
    audit_parser = subparsers.add_parser('audit', help='Privacy audit and compliance checking')
    audit_parser.add_argument('input', help='File or directory to audit')
    audit_parser.add_argument('--report', '-r', help='Generate audit report')
    audit_parser.add_argument('--format', choices=['text', 'json', 'html'], default='text', help='Report format')
    audit_parser.add_argument('--policy', help='Privacy policy for compliance check')
    
    # Policy command
    policy_parser = subparsers.add_parser('policy', help='Privacy policy management')
    policy_parser.add_argument('action', choices=['list', 'create', 'edit', 'delete'], help='Policy action')
    policy_parser.add_argument('name', nargs='?', help='Policy name')
    policy_parser.add_argument('--template', help='Policy template to use')
    
    # Default to scrub if no command specified
    parser.set_defaults(command='scrub')
    
    # Version argument
    parser.add_argument(
        '--version', 
        action='version',
        version=f"bear-ai-privacy {get_version()}"
    )
    
    args = parser.parse_args(argv)
    
    # Route to appropriate handler
    if args.command == 'scrub':
        handle_scrub_command(args)
    elif args.command == 'audit':
        handle_audit_command(args)
    elif args.command == 'policy':
        handle_policy_command(args)
    else:
        parser.print_help()


def handle_scrub_command(args):
    """Handle PII scrubbing command"""
    
    try:
        from .scrub import main as scrub_main, PIIScrubbingGUI
        
        if args.gui:
            print("🚀 Launching PII Scrubbing GUI...")
            app = PIIScrubbingGUI()
            app.run()
        elif args.interactive:
            scrub_main(['--interactive'])
        elif args.input:
            scrub_args = []
            if args.output:
                scrub_args.extend(['--output', args.output])
            if args.policy:
                scrub_args.extend(['--policy', args.policy])
            if args.format != 'text':
                scrub_args.extend(['--format', args.format])
            scrub_args.append(args.input)
            scrub_main(scrub_args)
        else:
            print("🛡️  BEAR AI PII Scrubber")
            print("Enter text to scrub (Ctrl+D when finished):")
            
            lines = []
            try:
                while True:
                    line = input()
                    lines.append(line)
            except EOFError:
                pass
                
            if lines:
                text = '\\n'.join(lines)
                scrub_main(['--text', text])
            else:
                print("No input provided")
                
    except ImportError as e:
        print(f"❌ Privacy tools not available: {e}")
        print("Install with: pip install bear-ai[privacy]")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error in PII scrubbing: {e}")
        sys.exit(1)


def handle_audit_command(args):
    """Handle privacy audit command"""
    
    try:
        from .audit import PrivacyAuditor
        
        print(f"🔍 Starting privacy audit of: {args.input}")
        
        auditor = PrivacyAuditor()
        
        # Configure audit options
        if args.policy:
            auditor.set_policy(args.policy)
            
        # Run audit
        results = auditor.audit_path(args.input)
        
        # Generate report
        if args.report:
            auditor.generate_report(results, args.report, args.format)
            print(f"📊 Audit report saved to: {args.report}")
        else:
            auditor.print_results(results, args.format)
            
    except ImportError as e:
        print(f"❌ Privacy audit not available: {e}")
        print("Install with: pip install bear-ai[privacy]")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error in privacy audit: {e}")
        sys.exit(1)


def handle_policy_command(args):
    """Handle privacy policy management"""
    
    try:
        from .policy import PolicyManager
        
        manager = PolicyManager()
        
        if args.action == 'list':
            policies = manager.list_policies()
            print("Available privacy policies:")
            for policy in policies:
                print(f"  • {policy['name']} - {policy['description']}")
                
        elif args.action == 'create':
            if not args.name:
                print("❌ Policy name required for create action")
                sys.exit(1)
                
            template = args.template or 'default'
            manager.create_policy(args.name, template)
            print(f"✅ Created policy: {args.name}")
            
        elif args.action == 'edit':
            if not args.name:
                print("❌ Policy name required for edit action")
                sys.exit(1)
                
            manager.edit_policy(args.name)
            
        elif args.action == 'delete':
            if not args.name:
                print("❌ Policy name required for delete action")
                sys.exit(1)
                
            manager.delete_policy(args.name)
            print(f"🗑️  Deleted policy: {args.name}")
            
    except ImportError as e:
        print(f"❌ Policy management not available: {e}")
        print("Install with: pip install bear-ai[privacy]")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error in policy management: {e}")
        sys.exit(1)


def get_version():
    """Get BEAR AI version"""
    try:
        from bear_ai import __version__
        return __version__
    except ImportError:
        return "0.1.0-alpha"


if __name__ == "__main__":
    main()